import React from "react";

interface EmptyIterationsProps {
  exerciseTitle?: string;
}

export function EmptyIterations({
  exerciseTitle,
}: EmptyIterationsProps): React.JSX.Element {
  return (
    <div className="empty-iterations">
      <div className="empty-state">
        <div className="icon">📝</div>
        <h3>No iterations yet</h3>
        <p>
          {exerciseTitle
            ? `You haven't submitted any iterations for ${exerciseTitle} yet.`
            : "You haven't submitted any iterations yet."}
        </p>
        <p>Start coding and submit your first iteration to see it here!</p>
      </div>
    </div>
  );
}

export default EmptyIterations;
