import { Link, useNavigate, useParams } from "react-router-dom";

import Modal from "../UI/Modal.jsx";
import EventForm from "./EventForm.jsx";
import { useMutation, useQuery } from "@tanstack/react-query";
import { fetchEvent, queryClient, updateEvent } from "../../../util/http.js";

import LoadingIndicator from "../UI/LoadingIndicator.jsx";
import ErrorBlock from "../UI/ErrorBlock.jsx";

export default function EditEvent() {
  const navigate = useNavigate();
  const params = useParams();

  const { data, isPending, isError, error } = useQuery({
    queryKey: ["events", { id: params.id }],
    queryFn: ({ signal }) => fetchEvent({ signal, id: params.id }),
  });

  const { mutate } = useMutation({
    mutationFn: updateEvent,
    onMutate: async (data) => {
      // data를 통하여 mutate로 넘기는 값들을 가져올 수 있음
      // 밑에 코드는 mutate로 넘기는 객체 값중 event키 값을 가져오는 것.
      const newEvent = data.event;

      // 충돌이 안나도록 진행중인 쿼리를 취소한다.
      await queryClient.cancelQueries({
        queryKey: ["events", { id: params.id }],
      });
      // 롤백을 위해서 임의로 수정전에 기존 값을 변수에 저장
      const previousEvent = queryClient.getQueryData([
        "events",
        { id: params.id },
      ]);
      // setQueryData를 통하여 저장된 값을 수정함(백엔드 수정x)
      queryClient.setQueryData(["events", { id: params.id }], newEvent);

      return { previousEvent };
    },
    onError: (context) => {
      // 만약 에러가 생기면 onMutate에서 임의로 수정한 값이 있는데 리턴을 통하여 기존 값 저장한 데이터를 context로 받아 올 수 있고,
      // 똑같이 setQueryData를 통하여 이전값으로 임의로 롤백을 한다고 이해하면된다.
      queryClient.setQueryData(
        ["events", { id: params.id }],
        context.previousEvent
      );
    },
    onSettled: () => {
      // 모든 상황이 끝나면 초기화를 통하여 백과 프론트단에 데이터가 동일한지 업데이트 진행이라고 이해하면된다.
      queryClient.invalidateQueries(["events", { id: params.id }]);
    },
  });

  function handleSubmit(formData) {
    mutate({ id: params.id, event: formData });
    navigate("../");
  }

  function handleClose() {
    navigate("../");
  }

  return (
    <Modal onClose={handleClose}>
      {isPending && <LoadingIndicator />}
      {isError && (
        <ErrorBlock
          title="에러발생"
          message={error.info?.message || "다시 시도해주세요F"}
        />
      )}
      <EventForm inputData={data} onSubmit={handleSubmit}>
        <Link to="../" className="button-text">
          Cancel
        </Link>
        <button type="submit" className="button">
          Update
        </button>
      </EventForm>
    </Modal>
  );
}
