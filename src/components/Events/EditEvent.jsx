import { Link, useNavigate, useParams } from "react-router-dom";

import Modal from "../UI/Modal.jsx";
import EventForm from "./EventForm.jsx";
import { useQuery } from "@tanstack/react-query";
import { fetchEvent } from "../../../util/http.js";

import LoadingIndicator from "../UI/LoadingIndicator.jsx";
import ErrorBlock from "../UI/ErrorBlock.jsx";

export default function EditEvent() {
  const navigate = useNavigate();
  const params = useParams();

  const { data, isPending, isError, error } = useQuery({
    queryKey: ["events", { id: params.id }],
    queryFn: ({ signal }) => fetchEvent({ signal, id: params.id }),
  });

  function handleSubmit(formData) {}

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
