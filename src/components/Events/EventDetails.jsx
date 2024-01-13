import { useState } from "react";
import { Link, Outlet, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";

import Header from "../Header.jsx";
import ErrorBlock from "../UI/ErrorBlock.jsx";
import Modal from "../UI/Modal.jsx";
import { deleteEvent, fetchEvent, queryClient } from "../../../util/http.js";

export default function EventDetails() {
  const [isDeleting, setIsDeleting] = useState(false);

  const navigate = useNavigate();
  const params = useParams();
  const id = params.id;

  // 상세 페이지 데이터 요청
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["events", { id: id }],
    queryFn: ({ signal }) => fetchEvent({ id, signal }),
  });

  // 상세페이지 삭제 요청
  const {
    mutate,
    isPending: isDeletePending,
    isError: isDeleteError,
    error: deleteError,
  } = useMutation({
    mutationFn: deleteEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["events"],
        refetchType: "none",
      });
      navigate("/events");
    },
  });

  function handleStartDelete() {
    setIsDeleting(true);
  }

  function handleStopDelete() {
    setIsDeleting(false);
  }

  return (
    <>
      {isDeleting && (
        <Modal onClose={handleStopDelete}>
          <h2>정말로 삭제하시겠습니까?</h2>
          <p>다시 못 되돌립니다.</p>
          <div className="form-actions">
            {isDeletePending ? (
              <p>삭제중 입니다...</p>
            ) : (
              <>
                <button onClick={handleStopDelete} className="button-text">
                  취소
                </button>
                <button
                  onClick={() => mutate({ id: data.id })}
                  className="button"
                >
                  삭제
                </button>
              </>
            )}
            {isDeleteError && (
              <ErrorBlock
                title={"게시글 삭제중 에러발생"}
                message={
                  deleteError.info?.message ||
                  "문제가 발생했습니다. 잠시후 다시 시도해주세요."
                }
              />
            )}
          </div>
        </Modal>
      )}

      <Outlet />
      <Header>
        <Link to="/events" className="nav-item">
          View all Events
        </Link>
      </Header>
      {isPending && "아티클 생성중..."}
      {isError && (
        <ErrorBlock
          title={"상세페이지를 불러오지 못했습니다."}
          message={error.info?.message || "새로고침후 다시 시도해주세요."}
        />
      )}
      {data && (
        <article id="event-details">
          <header>
            <h1>{data.title}</h1>
            <nav>
              <button onClick={handleStartDelete}>Delete</button>
              <Link to="edit">Edit</Link>
            </nav>
          </header>
          <div id="event-details-content">
            <img src={`http://localhost:3000/${data.image}`} alt={data.title} />
            <div id="event-details-info">
              <div>
                <p id="event-details-location">{data.location}</p>
                <time
                  dateTime={`Todo-DateT$Todo-Time`}
                >{`${data.date} ${data.time}`}</time>
              </div>
              <p id="event-details-description">{data.description}</p>
            </div>
          </div>
        </article>
      )}
    </>
  );
}
