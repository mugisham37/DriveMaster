import React from "react";
import { Trans } from "react-i18next";
// Remove unused import
// Remove unused import
import { usePaginatedRequestQuery } from "@/hooks/request-query";
import { useList } from "@/hooks/use-list";
import { scrollToTop } from "@/utils/scroll-to-top";
// Remove unused import
import {
  Avatar,
  GraphicalIcon,
  Pagination,
  TrackIcon,
  ExerciseIcon,
} from "@/components/common";
// Remove unused imports and types
import { FetchingBoundary } from "@/components/FetchingBoundary";
import { ResultsZone } from "@/components/ResultsZone";
import { Modal, type ModalProps } from "./Modal";
import type {
  PaginatedResult,
  MentorDiscussion,
  Student,
} from "@/components/types";
import { fromNow } from "@/utils/time";

export const PreviousMentoringSessionsModal = ({
  onClose,
  student,
  ...props
}: Omit<ModalProps, "className"> & {
  student: Student;
}): React.JSX.Element => {
  // Remove unused t variable
  // const { t } = useAppTranslation(
  //   'components/modals/PreviousMentoringSessionsModal.tsx'
  // )
  const { request, setPage } = useList({
    endpoint: student.links?.previousSessions || "",
    options: {},
  });

  const {
    status,
    data: resolvedData,
    isFetching,
    error,
  } = usePaginatedRequestQuery(
    [request.endpoint, JSON.stringify(request.query || {})],
    request
  ) as {
    status: 'pending' | 'error' | 'success';
    data: PaginatedResult<MentorDiscussion> | undefined;
    isFetching: boolean;
    error: Error | null;
  };

  const numPrevious = student.numDiscussionsWithMentor - 1;
  // Create a simple screen size check since ScreenSizeContext is not properly typed
  const isBelowLgWidth = false; // Default to false for now

  if (isBelowLgWidth) {
    return (
      <Modal
        {...props}
        closeButton
        onClose={onClose}
        className="m-mentoring-sessions mobile"
      >
        <header>
          <Trans
            i18nKey="headerMobile"
            ns="components/modals/PreviousMentoringSessionsModal.tsx"
            count={numPrevious}
            values={{ count: numPrevious, studentHandle: student.handle }}
            components={{
              strong: <strong />,
            }}
          />
        </header>
        <div className="discussions">
          <ResultsZone isFetching={isFetching}>
            <FetchingBoundary
              status={status}
              error={error}
              defaultError={new Error("Unable to load discussions")}
            >
              {resolvedData ? (
                <>
                  {resolvedData.results.map((discussion) => (
                    <MobileDiscussionLink
                      discussion={discussion}
                      key={discussion.uuid}
                    />
                  ))}
                  <Pagination
                    disabled={resolvedData === undefined}
                    current={(request.query?.page as number) || 1}
                    total={resolvedData.meta.totalPages}
                    setPage={(p) => {
                      setPage(p);
                      scrollToTop();
                    }}
                  />
                </>
              ) : null}
            </FetchingBoundary>
          </ResultsZone>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      {...props}
      closeButton
      onClose={onClose}
      className="m-mentoring-sessions"
    >
      <header>
        <Trans
          i18nKey="header"
          ns="components/modals/PreviousMentoringSessionsModal.tsx"
          count={numPrevious}
          values={{ count: numPrevious, studentHandle: student.handle }}
          components={{
            strong: <strong />,
            avatar: <Avatar src={student.avatarUrl} handle={student.handle} />,
            name: <div className="student-name" />,
          }}
        />
        {student.links?.favorite ? (
          <div className="favorite-button-placeholder">
            {/* FavoriteButton component needs proper typing */}
            <button onClick={() => console.log("Favorite clicked")}>
              ⭐ Favorite
            </button>
          </div>
        ) : null}
      </header>
      <div className="discussions">
        <ResultsZone isFetching={isFetching}>
          <FetchingBoundary
            status={status}
            error={error}
            defaultError={new Error("Unable to load discussions")}
          >
            {resolvedData ? (
              <>
                {resolvedData.results.map((discussion) => (
                  <DiscussionLink
                    discussion={discussion}
                    key={discussion.uuid}
                  />
                ))}
                <Pagination
                  disabled={resolvedData === undefined}
                  current={(request.query?.page as number) || 1}
                  total={resolvedData.meta.totalPages}
                  setPage={(p) => {
                    setPage(p);
                    scrollToTop();
                  }}
                />
              </>
            ) : null}
          </FetchingBoundary>
        </ResultsZone>
      </div>
    </Modal>
  );
};

function DiscussionLink({
  discussion,
}: {
  discussion: MentorDiscussion;
}): React.JSX.Element {
  return (
    <a
      href={discussion.links.self}
      key={discussion.uuid}
      className="discussion"
    >
      <TrackIcon
        iconUrl={discussion.track.iconUrl}
        title={discussion.track.title}
      />
      <ExerciseIcon
        iconUrl={discussion.exercise.iconUrl}
        title={discussion.exercise.title}
        className="exercise-icon"
      />
      <div className="exercise-title">{discussion.exercise.title}</div>
      <div className="num-comments">
        <GraphicalIcon icon="comment" />
        {(discussion as MentorDiscussion & { postsCount?: number })
          .postsCount || 0}
      </div>
      <div className="num-iterations">
        <GraphicalIcon icon="iteration" />
        {(discussion as MentorDiscussion & { iterationsCount?: number })
          .iterationsCount || 0}
      </div>
      <time dateTime={discussion.createdAt}>
        {fromNow(discussion.createdAt)}
      </time>
      <GraphicalIcon icon="chevron-right" className="action-icon" />
    </a>
  );
}

function MobileDiscussionLink({
  discussion,
}: {
  discussion: MentorDiscussion;
}): React.JSX.Element {
  return (
    <a
      href={discussion.links.self}
      key={discussion.uuid}
      className="discussion mobile"
    >
      <TrackIcon
        iconUrl={discussion.track.iconUrl}
        title={discussion.track.title}
      />
      <ExerciseIcon
        iconUrl={discussion.exercise.iconUrl}
        title={discussion.exercise.title}
        className="exercise-icon"
      />
      <div className="num-comments">
        <GraphicalIcon icon="comment" />
        {(discussion as MentorDiscussion & { postsCount?: number })
          .postsCount || 0}
      </div>
      <div className="num-iterations">
        <GraphicalIcon icon="iteration" />
        {(discussion as MentorDiscussion & { iterationsCount?: number })
          .iterationsCount || 0}
      </div>
      <GraphicalIcon icon="chevron-right" className="action-icon" />
    </a>
  );
}
