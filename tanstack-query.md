# tanstack-query === 리액트 쿼리 라이브러리 설치

`npm i @tanstack/react-query`

# 기본 문법 사용법

## 코드

```js
// NewEventsSection.jsx
import { useQuery } from "@tanstack/react-query";
import { fetchEvents } from "../../../util/http.js";

// Key와 Fn을 설정해준다.
const { data, isPending, isError, error } = useQuery({
  queryKey: ["events"],
  // 프로미스 객체를 리턴하는 함수를 넣어줘야함
  queryFn: fetchEvents,
});

// util/http.js

// http요청 함수
export async function fetchEvents() {
  const response = await fetch("http://localhost:3000/events");

  if (!response.ok) {
    const error = new Error("An error occurred while fetching the events");
    error.code = response.status;
    error.info = await response.json();
    throw error;
  }

  const { events } = await response.json();

  return events;
}
```

## App.js 에서 감싸주기

- QueryClient와 QueryClientProvider을 렌더링 최상단에서 감싸주어야 한다.

```js
// app.js

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

...코드들

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

... 코드들

```

# staleTime과 gcTime

[staleTime과 gcTime참고 블로그](https://velog.io/@minw0_o/tanstack-query-staleTime-invalidQueries%EB%A5%BC-%EC%9D%B4%EC%9A%A9%ED%95%9C-data-%EC%83%81%ED%83%9C-%EA%B4%80%EB%A6%AC#-staletime)

## staleTime

- 캐시된 data가 신선한 상태(fresh)로 남아있는 시간을 말한다.
- 특정 쿼리 키에 대한 data를 다시 fetch 해와야 하는 상황일 때,
  - 해당하는 data가 fresh한 상태라면, API 호출 없이 캐싱된 data가 다시 사용된다.
  - 해당하는 data가 stale한 상태라면, API 호출을 통해 신선한 data를 다시 fetch해오고, 이 data를 cache에 저장한다.

## gcTime

- 메모리에 저장된 캐싱 데이터가 유효한 시간(캐시 메모리에 남아있는 시간)을 의미한다.

# 리액트 쿼리 사용시 api요청함수에 매개변수 추가할때(?search=검색어)

## 잘못된 예시

```js
// http.js

// 검색어
//잘못된 부분
export async function fetchEvents(searchPath) {
  console.log(searchPath);
  let url = "http://localhost:3000/events";

  // 검색어가 있다면 url따로 처리하기
  if (searchPath) {
    url += "?search=" + searchPath;
  }

//잘못된 부분
  const response = await fetch(url);

  if (!response.ok) {
    const error = new Error("An error occurred while fetching the events");
    error.code = response.status;
    error.info = await response.json();
    throw error;
  }

  const { events } = await response.json();

  return events;
}

-----------------------------------------------------

// FindEventSection.jsx

  const searchElement = useRef();
  const [searchPath, setSearchPath] = useState("");

  const { data, isPending, isError, error } = useQuery({
    // 키가 이벤트 전체를 읽어오는 것이 아니기 때문에 search를 추가로 설정
    queryKey: ["events", { search: searchPath }],
    //잘못된 부분
    queryFn: () => fetchEvents(searchPath),
  });

  function handleSubmit(event) {
    event.preventDefault();
    setSearchPath(searchElement.current.value);
  }
```

![](/스크린샷%202024-01-11%20오후%2012.06.57.png)
![](/스크린샷%202024-01-11%20오후%2012.09.01.png)

- 위 코드와 같이 api요청시 전체 데이터를 읽어오는 것이 아니라 매개변수를 받아와서 사용하면 저렇게 사용해야 한다고 생각할 수 있지만,
  콘솔과 네트워크를 확인해보면 **리액트 쿼리는 객체를 기본값으로 전송을 한다.** => 전송되는 객체를 보면 `signal`이 있는데 요청중 이탈이 되면 요청을 취소해주는 역할을 한다.

## 잘 된 예시

```js
// http.js

// 변경된 부분
export async function fetchEvents({ signal, searchPath }) {
  console.log(searchPath);
  let url = "http://localhost:3000/events";

  if (searchPath) {
    url += "?search=" + searchPath;
  }
// 변경된 부분
  const response = await fetch(url, { signal: signal });

  if (!response.ok) {
    const error = new Error("An error occurred while fetching the events");
    error.code = response.status;
    error.info = await response.json();
    throw error;
  }

  const { events } = await response.json();

  return events;
}

-----------------------------------------------------

// FindEventSection.jsx

  const searchElement = useRef();
  const [searchPath, setSearchPath] = useState("");

 const { data, isPending, isError, error } = useQuery({
    // 키가 이벤트 전체를 읽어오는 것이 아니기 때문에 search를 추가로 설정
    queryKey: ["events", { search: searchPath }],
    // 변경된 부분
    queryFn: ({ signal }) => fetchEvents({ signal, searchPath }),
  });

  function handleSubmit(event) {
    event.preventDefault();
    setSearchPath(searchElement.current.value);
  }

```

- 위 코드와 같이 객체분할을 활용하여 익명함수에 signal객체를 받아오고 http요청 함수 매개변수로 signal과 보내고 싶은 매개변수를 추가하여 보내주면된다.
- 객체분할할당으로 가져오기때문에 매개변수 이름을 똑같이 해주어야 한다.

# 쿼리 활성화 및 비활성화 - enabled(필요로 할때만 쿼리 요청하기(http요청하기))

## 코드 & 설명

```js
// 1번 처음화면, 검색창 빈값으로 검색 시 데이터 안받아옴 로직

const searchElement = useRef();
const [searchPath, setSearchPath] = useState("");

const { data, isLoading, isError, error } = useQuery({
  // 키가 이벤트 전체를 읽어오는 것이 아니기 때문에 search를 추가로 설정
  queryKey: ["events", { search: searchPath }],
  queryFn: ({ signal }) => fetchEvents({ signal, searchPath }),
  // 추가 활성화 및 비활성화 속성
  enabled: searchPath !== "",
});

function handleSubmit(event) {
  event.preventDefault();
  setSearchPath(searchElement.current.value);
}

-----------------------------------------------

// 2번 처음화면은 데이터x, 검색창 빈값으로 검색시 모든 데이터o 로직

const searchElement = useRef();
const [searchPath, setSearchPath] = useState();

const { data, isLoading, isError, error } = useQuery({
  // 키가 이벤트 전체를 읽어오는 것이 아니기 때문에 search를 추가로 설정
  queryKey: ["events", { search: searchPath }],
  queryFn: ({ signal }) => fetchEvents({ signal, searchPath }),
  // 추가 활성화 및 비활성화 속성
  enabled: searchPath !== undifined,
});

function handleSubmit(event) {
  event.preventDefault();
  setSearchPath(searchElement.current.value);
}
```

- 위 코드를 보면 `enabled`추가 하였다. boolean값을 받는다.(true = 요청하겠다, false = 요청하지 않겠다.)
- 빈문자열이 아니라면 true라는 조건을 주었기 때문에 검색어가 있을때만 요청을 하게 된다.
  - 1번 로직: 위 로직은 1. 처음 페이지 들어갔을때 2. 검색어 입력후 빈 값을 검색했을때 false가 되기에 데이터를 받아오지 않는다.
  - 2번 로직: 허나 1. 처음은 데이터가 없고 2. 검색어 입력후 빈 값을 검색했을때 모든 데이터가 뜨고 싶게 하고싶다면, 상태 초깃값을 undifined로 두고 enabled조건을 언디파인드가 아닐때로 수정하면 된다.

---

# Post요청

## useMutation

```js
// NewEvent.jsx

// Post 요청시에는 useMutation을 사용한다.
const { mutate, isPending, isError, error } = useMutation({
  mutationFn: createNewEvent,
});

function handleSubmit(formData) {
  mutate({ event: formData });
}

return (
  <Modal onClose={() => navigate("../")}>
    <EventForm onSubmit={handleSubmit}>
      // isPending을 사용하여 데이터 전송중일때 처리F
      {isPending && "등록중..."}
      {!isPending && (
        <>
          <Link to="../" className="button-text">
            Cancel
          </Link>
          <button type="submit" className="button">
            Create
          </button>
        </>
      )}
    </EventForm>
    // 에러 처리
    {isError && (
      <ErrorBlock
        title="생성하는데 실패 했습니다."
        message={
          error.info?.message ||
          "다시한번 확인해주세요. 놓친부분이 있는거 같습니다."
        }
      />
    )}
  </Modal>
);

---------------------------------------------

// http.js

// Post요청
export async function createNewEvent(eventData) {
  const response = await fetch(`http://localhost:3000/events`, {
    method: "POST",
    body: JSON.stringify(eventData),
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = new Error("An error occurred while creating the event");
    error.code = response.status;
    error.info = await response.json();
    throw error;
  }

  const { event } = await response.json();

  return event;
}
```

- 위 코드들을 보면 Post요청시에는 `useMutation`을 사용하여 객체 할당으로`mutate`를 사용하여 특정 이벤트시 요청이 되도록 가능하다.
- 또한 강의를 보면 `대기상태`와 `에러처리`를 항상 하는 것을 볼 수 있는데, 이 부분도 어떻게 처리하는지 보고 기억하면 좋을거 같다.

# post 요청 성공시 후 처리하기(라우터처리&데이터 업데이트 즉시 적용)

## 코드

```js
// http.js

import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient();

---------------------------------------------

// NewEvent.jsx

  const navigate = useNavigate();

  // Post 요청시에는 useMutation을 사용한다.
  const { mutate, isPending, isError, error } = useMutation({
    mutationFn: createNewEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      // exact속성을 통하여 정확하 key가 맞는 query만 무효화 할 수 있다.
      // queryClient.invalidateQueries({ queryKey: ["events"], exact:true });
      navigate("/events");
    },
  });

  function handleSubmit(formData) {
    mutate({ event: formData });
  }
```

### 설명

- 위 코드를 보면 `useMutation`속성중 `onSuccess`가 있다. 이 속성을 사용하여 post요청이 정상적으로 성공시에 실행이 되는 코드들을 넣을 수 있다.
- `queryClient.invalidateQueries()`를 사용하기 위해서는 보통 최상단 렌더링이(`App.jsx`) 되는 곳에 사용하던 `const queryClient = new QueryClient();` 코드를 `util`파일에 따로 빼서 다른 곳에서도 사용할 수 있도록 하였고,
- `useMutation`이 사용되는 곳에 불러서 `queryClient.invalidateQueries()`를 사용하여 `queryKey`를 넣어주어 데이터 무효화를 했다(데이터 무효화가 되면 업데이트가 되기 떄문)
- 그리고 특정키만 무효화 시키고 싶다면 `exact`속성을 사용할 수 있겠지만, 만약 수정된 데이터와 관련된 key들이 많다면 굳이 특정 key만 무효화 시키는것이 아니라 전체가 업데이트 되도록 하는 것이 좋을것같다.
- 보통은 서브밋 버튼 이벤트에서 라우터로 이동을 하겠지만 onSuccess 속성을 사용함으로 좀더 확실하게 성공시에만 실행이 되도록 설정이 가능한것 같다.

# 과제 => 클릭시 상세페이지 이동 & 상세페이지 삭제

## 전체 코드

```js

// http.js 요청 util파일
export async function fetchEvent({ id, signal }) {
  const response = await fetch(`http://localhost:3000/events/${id}`, {
    signal,
  });

  if (!response.ok) {
    const error = new Error("An error occurred while fetching the event");
    error.code = response.status;
    error.info = await response.json();
    throw error;
  }

  const { event } = await response.json();

  return event;
}

export async function deleteEvent({ id }) {
  const response = await fetch(`http://localhost:3000/events/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = new Error("An error occurred while deleting the event");
    error.code = response.status;
    error.info = await response.json();
    throw error;
  }

  return response.json();
}

-------------------------------------------

// detailsPage.jsx

export default function EventDetails() {
  const navigate = useNavigate();
  const params = useParams();
  const id = params.id;

  // 상세 페이지 데이터 요청
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["events", { id: id }],
    queryFn: ({ signal }) => fetchEvent({ id, signal }),
  });

  // 상세페이지 삭제 요청
const { mutate } = useMutation({
  mutationFn: deleteEvent,
  onSuccess: () => {
    queryClient.invalidateQueries({
      queryKey: ["events"],
      refetchType: "none",
    });
    navigate("/events");
  },
});

  return (
    <>
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
              <button onClick={() => mutate({ id: data.id })}>Delete</button>
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
```

## 설명 & 실수한 부분

### 1. 상세페이지 가져오기 설명

1. 상세 페이지 가져오기 같은 부분은 `useQuery`를 사용해서 데이터를 읽어올 수 있다.
2. 상세 페이지는 보통 라우트에서 동적 경로처리를 한다.`(/:id)처럼` 그러고 상세 페이지로 이동하는 버튼에 대게는 `id`를 넣어서 상세페이지 `params`에서 가져올 수 있게 한다.
3. 그러므로 `useParams()`를 사용하여 파람을 가져오고, 객체형식으로 `signal과 id`값을 요청함수에서 매개변수로 받기 때문에 `id`를 넘겨주어서 데이터를 가져왔다.

#### 실수한 부분

```js
// 성공

// 상세 페이지 데이터 요청
const { data, isPending, isError, error } = useQuery({
  queryKey: ["events", { id: id }],
  queryFn: ({ signal }) => fetchEvent({ id, signal }),
});

--------------------------------

// 실패

// 상세 페이지 데이터 요청
const { data, isPending, isError, error } = useQuery({
  queryKey: ["event-detail"],
  queryFn: ({ signal }) => fetchEvent({ id, signal }),
});
```

1. 성공과 실패를 비교해보면 둘다 데이터가 잘 들어온다. => 하지만 문제가 다른 상세페이지로 이동할때 이전 캐쉬값을 가지고 있어서 그런지 이전 화면이 잠시 보였다가 데이터가 다 받아와지면 해당 페이지가 보였다.

=> 이유 : `queryKey`를 똑같이 해줬기 때문이였다. 같은 `쿼리 키`이기 때문에 캐쉬값이 적용이 되어서 그런거였다.
=> 해결 : `queryKey`와 두번째 인자를 객체 형식으로 `id`를 기준으로 따로 분리를 해주었다.

### 2. 상세페이지 삭제 설명

1. `useMutation`을 사용하여 진행 하였다.
2. `mutate`를 받아와서 삭제 버튼 클릭 이벤트시 실행이 되도록 해서 `mutate({id: data.id})`형식으로 가져왔다.
   => 이유는 처음에는 `id`만 넘겼는데 삭제 요청 함수를 보면 객체 분할로 `id`값을 받기 때문에 키 값을 id로 설정해주고 데이터를 넣어주어야 한다.
3. 그리고 `onSuccess`를 사용해서 요청 성공후 `queryCliet.invaildateQueries()`를 사용하여 쿼리 키에 맞는 캐쉬값을 업데이트 해주었다.
4. 그 후 네비게이트를 통하여 홈 `events`화면으로 이동

### 실수한 부분

```js
//성공

// 상세페이지 삭제 요청
const { mutate } = useMutation({
  mutationFn: deleteEvent,
  onSuccess: () => {
    queryClient.invalidateQueries({
      queryKey: ["events"],
      refetchType: "none",
    });
    navigate("/events");
  },
});

-------------------------------

// 실패

// 상세페이지 삭제 요청
const { mutate } = useMutation({
  mutationFn: deleteEvent,
  onSuccess: () => {
    queryClient.invalidateQueries({queryKey: ["events"]});
    navigate("/events");
  },
});

```

![](/스크린샷%202024-01-13%20오후%203.42.36.png)
![](/스크린샷%202024-01-13%20오후%203.43.13.png)

- 위 두개를 비교해보면 `queryClient.invalidateQueries()`요청시 실패 부분에서는 `쿼리 키`설정으로 무효화를 시켰는데 이때 `개발자 도구에서 네트워크`를 확인 해보면 한번더 처음 무효화하는 시점에서 해당 사이트가 삭제되기전 트리거가 되기때문에 오류가 생성이 된다.
  => 해결 : `refetchType:'none'`설정을 통하여 트리거가 다시 되지 않도록 설정을 할 수 있다.

# 상세페이지 삭제시 모달로 먼저 처리하기

- 기본적으로 모달을 포탈을 사용하고, 강의와 밑에 코드는 모달 컴포넌트가 따로 있고 `children`으로 코드를 받아오는 로직

```js
// EventDetails.jsx

import Modal from "../UI/Modal.jsx";

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


...코드들

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
```

## 설명

- 사실 예외 처리 하는 부분은 당연한 것이기에 넘어가고 다시 학습하고 기억해야할 부분
  => `isPending: isDeletePending,` 과 같이 `별칭할당` `useQuery`와 `useMutation`을 같이 쓰게 된다고 했을때 `변수가 겹치기 때문에` `별칭을`따로 설정해서 사용할 수 있다.

# 상세페이지 수정(Edit)하기 - onMutate,onError,onSettled사용

```js
// EditEvent.jsx

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
```

## 설명

1. 위에 로직을 먼저 설명하자면

- 백엔드로 요청하고 응답을 받아서 처리하기전, 프론트단에서 데이터를 임의로 수정하여 먼저 보여준후 백엔드 응답에 따라 사후 처리하는 로직

2. onMutate로 `data`를 받아 올 수 있는데 `mutate()`로 넘겨준 값들을 받아 올 수 있다. 그 값을 저장하고 `queryClient`에 여러 속성들을 사용하여 취소,가져오기,수정을 한다.
3. 그후 onError를 통하여 요청에 에러가 있다면 기존 값으로 수정을하고
4. onSettled에서 마지막에 서버와 프론트단에 데이터가 서로 같도록 업데이트 해준다.

# 요청시 queryKey 객체 값으로 요청함수에 값 전달하기(queryKey이용하기)

```js
// http.js

export async function fetchEvents({ signal, searchPath, max }) {
  let url = "http://localhost:3000/events";

  if (searchPath && max) {
    url += "?search=" + searchPath + "?max=" + max;
  } else if (searchPath) {
    url += "?search=" + searchPath;
  } else if (max) {
    url += "?max=" + max;
  }

  const response = await fetch(url, { signal: signal });

  if (!response.ok) {
    const error = new Error("An error occurred while fetching the events");
    error.code = response.status;
    error.info = await response.json();
    throw error;
  }

  const { events } = await response.json();

  return events;
}

----------------------------------------------

// NewEventsSection.jsx

const { data, isPending, isError, error } = useQuery({
  queryKey: ["events", { max: 3 }],
  queryFn: ({ signal, queryKey }) => fetchEvents({ signal, ...queryKey[1] }),
  // 브라우저 캐쉬 유효 시간 설정
  staleTime: 5 * 1000,
  // 캐쉬 보관 시간 설정
  // gcTime: 1000,
});
```

## 설명

1. 데이터를 3개만 가져오도록 요청 하는 코드인데, `queryKey`구분을 위해 아이디를 줬을때, 요청값도 같다면 `queryFn`에서 `queryKey`를 받아 올 수 있고, 배열 인덱스를 통해 그 값을 불러올 수 있다.
