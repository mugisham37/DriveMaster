'use client';

import React, { useCallback, useMemo, useState } from "react";
import { camelize } from "humps";

// Types
export type ConceptStatus = "locked" | "available" | "learned" | "mastered";

export interface IConcept {
  slug: string;
  webUrl: string;
  tooltipUrl: string;
  name: string;
}

export function isIConcept(concept: IConcept | undefined): concept is IConcept {
  return concept !== undefined;
}

export type ConceptConnection = {
  from: string;
  to: string;
};

export type ConceptLayer = string[];

export type ExerciseData = {
  url: string;
  slug: string;
  tooltipUrl: string;
  status: "available" | "started" | "completed" | "published" | "locked";
  type: string;
};

export type ConceptStatusIndex = { [key: string]: ConceptStatus };
export type ExercisesDataIndex = { [key: string]: ExerciseData[] };

export interface IConceptMap {
  concepts: IConcept[];
  levels: ConceptLayer[];
  connections: ConceptConnection[];
  status: ConceptStatusIndex;
  exercisesData: ExercisesDataIndex;
}

// Components
const PureConcept = React.memo(
  ({
    slug,
    name,
    webUrl,
    handleEnter,
    handleLeave,
    status,
    exercisesData,
    isActive,
  }: {
    slug: string;
    name: string;
    webUrl: string;
    handleEnter: () => void;
    handleLeave: () => void;
    status: ConceptStatus;
    exercisesData: ExerciseData[];
    isActive: boolean;
  }) => {
    const isLocked = status === "locked";

    const classes = ["card", status];
    if (isActive) {
      classes.push("active");
    }

    return (
      <div role="presentation">
        <div
          id={`concept-${slug}`}
          className={classes.join(" ")}
          data-concept-slug={slug}
          data-concept-status={status}
        >
          <a
            className="display"
            href={webUrl}
            onMouseEnter={handleEnter}
            onMouseLeave={handleLeave}
          >
            <div className="concept-icon">
              <span className="name">{name}</span>
            </div>
          </a>
          {!isLocked && exercisesData && (
            <div className="exercise-status-bar">
              {exercisesData.map((exercise) => (
                <div
                  key={exercise.slug}
                  className={`exercise-dot --${exercise.status} --${exercise.type}`}
                  title={exercise.slug}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }
);

PureConcept.displayName = "PureConcept";

const ConceptConnections = ({
  connections,
  activeConcepts,
}: {
  connections: ConceptConnection[];
  activeConcepts: Set<string>;
}) => {
  return (
    <svg className="connections">
      {connections.map((connection, index) => {
        const isActive =
          activeConcepts.has(connection.from) &&
          activeConcepts.has(connection.to);
        return (
          <line
            key={`${connection.from}-${connection.to}-${index}`}
            className={`connection ${isActive ? "active" : ""}`}
            x1="0"
            y1="0"
            x2="100"
            y2="100"
            stroke={isActive ? "#007acc" : "#ccc"}
            strokeWidth="2"
          />
        );
      })}
    </svg>
  );
};

// Main Component
export default function ConceptMap({
  concepts,
  levels,
  connections,
  status,
  exercisesData,
}: IConceptMap): React.JSX.Element {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  const unsetActiveSlug = useCallback(
    () => setActiveSlug(null),
    [setActiveSlug]
  );

  const conceptsBySlug = useMemo(
    () => indexConceptsBySlug(concepts),
    [concepts]
  );

  const descendantsBySlug = useMemo(
    () => indexDescendantsBySlug(connections),
    [connections]
  );

  const parentsBySlug = useMemo(
    () => indexParentsBySlug(connections),
    [connections]
  );

  const activeSlugsBySlug = useMemo(
    () => indexActiveSlugsBySlug(concepts, parentsBySlug, descendantsBySlug),
    [concepts, parentsBySlug, descendantsBySlug]
  );

  const activeSlugs = activeSlug
    ? activeSlugsBySlug.get(activeSlug) ?? new Set<string>()
    : new Set<string>();

  return (
    <figure className="c-concepts-map">
      <div className="track">
        {levels.map((layer, i: number) => (
          <div key={`layer-${i}`} className="layer">
            {layer
              .map((conceptSlug) => conceptsBySlug.get(camelize(conceptSlug)))
              .filter(isIConcept)
              .map((concept) => {
                const slug = camelize(concept.slug);
                const isActive = activeSlug === null || activeSlugs.has(slug);

                return (
                  <PureConcept
                    key={slug}
                    slug={slug}
                    name={concept.name}
                    webUrl={concept.webUrl}
                    exercisesData={exercisesData[slug] || []}
                    handleEnter={() => setActiveSlug(slug)}
                    handleLeave={unsetActiveSlug}
                    status={status[slug] ?? "locked"}
                    isActive={isActive}
                  />
                );
              })}
          </div>
        ))}
      </div>
      <ConceptConnections
        connections={connections}
        activeConcepts={activeSlugs}
      />
    </figure>
  );
}

// Helper functions
function indexConceptsBySlug(concepts: IConcept[]): Map<string, IConcept> {
  return concepts.reduce((memo, concept) => {
    memo.set(camelize(concept.slug), concept);
    return memo;
  }, new Map<string, IConcept>());
}

type AdjacentIndex = Map<string, Set<string>>;
type RelationReducer = (connection: ConceptConnection) => [string, string];

const indexAdjacentBySlug = function (
  connections: ConceptConnection[],
  relationReducer: RelationReducer,
  index = new Map()
): AdjacentIndex {
  const addToIndex = (index: AdjacentIndex, from: string, to: string): void => {
    const adjacent = index.get(from) ?? new Set();
    adjacent.add(to);
    index.set(from, adjacent);
  };

  return connections.reduce((relatives, connection) => {
    const [from, to] = relationReducer(connection);
    addToIndex(relatives, from, to);
    return relatives;
  }, index);
};

const indexParentsBySlug = function (
  connections: ConceptConnection[]
): AdjacentIndex {
  const parentReducer: RelationReducer = (connection) => [
    camelize(connection.to),
    camelize(connection.from),
  ];
  return indexAdjacentBySlug(connections, parentReducer);
};

const indexDescendantsBySlug = function (
  connections: ConceptConnection[]
): AdjacentIndex {
  const descendantReducer: RelationReducer = (connection) => [
    camelize(connection.from),
    camelize(connection.to),
  ];
  return indexAdjacentBySlug(connections, descendantReducer);
};

const findAllActiveSlugs = function (
  parentsBySlug: AdjacentIndex,
  descendantsBySlug: AdjacentIndex,
  activeSlug: string | null
): Set<string> {
  if (activeSlug === null) {
    return new Set();
  }

  const activeSlugs = new Set([activeSlug]);
  const processedSlugs = new Set<string>();
  const queue = [activeSlug];

  while (queue.length > 0) {
    const slug = queue.pop() as string;
    if (processedSlugs.has(slug)) {
      continue;
    }
    activeSlugs.add(slug);
    const parentSlugs = slug ? Array.from(parentsBySlug.get(slug) ?? []) : [];
    queue.push(...parentSlugs);
  }

  const descendantSlugs =
    descendantsBySlug.get(activeSlug) ?? new Set<string>();
  descendantSlugs.forEach((descendantSlug) => activeSlugs.add(descendantSlug));

  return activeSlugs;
};

const indexActiveSlugsBySlug = function (
  concepts: IConcept[],
  parentsBySlug: AdjacentIndex,
  descendantsBySlug: AdjacentIndex
): Map<string, Set<string>> {
  const index = new Map<string, Set<string>>();

  concepts.forEach((concept) => {
    const slug = camelize(concept.slug);
    const activeSlugsWhenConceptActive = findAllActiveSlugs(
      parentsBySlug,
      descendantsBySlug,
      slug
    );
    index.set(slug, activeSlugsWhenConceptActive);
  });

  return index;
};
