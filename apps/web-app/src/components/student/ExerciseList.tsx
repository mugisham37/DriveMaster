import React, { useState, useEffect } from "react";
import { usePaginatedRequestQuery, Request } from "@/hooks/request-query";
import { useHistory, removeEmpty } from "@/hooks/use-history";
import { useList } from "@/hooks/use-list";
import ExerciseWidget from "@/components/common/ExerciseWidget";
import { Exercise, SolutionForStudent } from "../../types";
import { FetchingBoundary } from "../FetchingBoundary";
import { ResultsZone } from "../ResultsZone";

const DEFAULT_ERROR = new Error("Unable to load exercises");

type FilterValue =
  | "published"
  | "completed"
  | "iterated"
  | "started"
  | "available"
  | "locked"
  | null;

class Result {
  exercise: Exercise;
  solution: SolutionForStudent | undefined;

  constructor(exercise: Exercise, solution: SolutionForStudent | undefined) {
    this.exercise = exercise;
    this.solution = solution;
  }

  get status() {
    if (this.solution) {
      return this.solution.status;
    }

    return this.exercise.isUnlocked ? "available" : "locked";
  }
}

class StatusFilter {
  values: FilterValue[] | undefined;
  title: string;
  id: string | undefined;

  constructor(title: string, values?: FilterValue[], id?: string) {
    this.values = values;
    this.title = title;
    this.id = id;
  }

  apply(results: Result[] | undefined) {
    if (!results) {
      return [];
    }

    const { values } = this;
    if (!values) {
      return results;
    }

    return results.filter((result) => values.includes(result.status));
  }
}

const Tab = ({
  filter,
  results,
  onClick,
  selected,
}: {
  filter: StatusFilter;
  results: Result[] | undefined;
  onClick: () => void;
  selected: boolean;
}) => {
  const classNames = ["c-tab", selected ? "selected" : null];

  return (
    <button type="button" className={classNames.join(" ")} onClick={onClick}>
      {filter.id ? <div className={`c-ed --${filter.id}`} /> : null}
      <span data-text={filter.title}>{filter.title}</span>
      <div className="count">{filter.apply(results).length}</div>
    </button>
  );
};

const STATUS_FILTERS = [
  new StatusFilter("All Exercises"),
  new StatusFilter("Completed", ["published", "completed"], "completed"),
  new StatusFilter("In Progress", ["iterated", "started"], "in_progress"),
  new StatusFilter("Available", ["available"], "available"),
  new StatusFilter("Locked", ["locked"], "locked"),
];

const ExerciseList = ({
  request: initialRequest,
  defaultStatus,
}: {
  request: Request;
  defaultStatus?: string;
}): React.JSX.Element => {
  const { request, setCriteria: setRequestCriteria } = useList(initialRequest);
  const [criteria, setCriteria] = useState<string>(
    (request.query?.criteria as string) || ""
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(() => {
    if (defaultStatus) {
      const found = STATUS_FILTERS.find(
        (filter) => filter.id === defaultStatus
      );
      if (found) return found;
    }
    return STATUS_FILTERS[0]!;
  });
  const {
    status,
    data: resolvedData,
    isFetching,
    error,
  } = usePaginatedRequestQuery<{
    exercises: Exercise[];
    solutions: SolutionForStudent[];
  }>(
    ["exercise-list", JSON.stringify(request)],
    request as Request<{
      exercises: Exercise[];
      solutions: SolutionForStudent[];
    }>
  );

  const results = resolvedData?.exercises?.map((exercise: Exercise) => {
    const solution = resolvedData.solutions?.find(
      (solution: SolutionForStudent) => solution.exercise.slug === exercise.slug
    );

    return new Result(exercise, solution);
  });

  useEffect(() => {
    const handler = setTimeout(() => {
      if (criteria === undefined || criteria === null) return;
      setRequestCriteria(criteria);
    }, 200);

    return () => {
      clearTimeout(handler);
    };
  }, [setRequestCriteria, criteria]);

  useHistory({
    pushOn: removeEmpty({
      criteria: request.query?.criteria || "",
      status: statusFilter.id || "",
    }),
  });

  return (
    <div className="lg-container container">
      <div className="c-search-bar">
        <input
          onChange={(e) => {
            setCriteria(e.target.value);
          }}
          value={criteria}
          type="text"
          className="--search"
          placeholder="Search by title"
        />
      </div>
      <div className="tabs">
        {STATUS_FILTERS.map((filter) => {
          return (
            <Tab
              key={filter.title}
              filter={filter}
              results={results}
              onClick={() => setStatusFilter(filter)}
              selected={filter === statusFilter}
            />
          );
        })}
      </div>
      <ResultsZone isFetching={isFetching}>
        <FetchingBoundary
          status={status}
          error={error}
          defaultError={DEFAULT_ERROR}
        >
          {results && results.length > 0 ? (
            <div className="exercises grid-cols-1 md:grid-cols-2">
              {statusFilter.apply(results).map((result) => {
                return (
                  /* Medium */
                  <ExerciseWidget
                    key={result.exercise.slug}
                    exercise={{
                      id: 1,
                      slug: result.exercise.slug,
                      title: result.exercise.title,
                      iconUrl: result.exercise.iconUrl,
                      difficulty:
                        typeof result.exercise.difficulty === "string"
                          ? 1
                          : result.exercise.difficulty,
                      blurb: result.exercise.blurb || "",
                      isUnlocked: result.exercise.isUnlocked || false,
                      isRecommended: false,
                      status: result.status as
                        | "available"
                        | "started"
                        | "completed"
                        | "published"
                        | "locked",
                      links: {
                        self: `/exercises/${result.exercise.slug}`,
                        tooltip: `/exercises/${result.exercise.slug}/tooltip`,
                      },
                    }}
                    {...(result.solution && {
                      solution: {
                        uuid: result.solution.uuid,
                        status: result.solution.status,
                        mentoringStatus: "none",
                        publishedIterationHeadTestsStatus: "passed",
                        hasNotifications: false,
                        numStars: 0,
                        numComments: 0,
                        numViews: 0,
                        isOutOfDate: false,
                      },
                    })}
                  />
                );
              })}
            </div>
          ) : (
            <p>No exercises found</p>
          )}
        </FetchingBoundary>
      </ResultsZone>
    </div>
  );
};

export default ExerciseList;
