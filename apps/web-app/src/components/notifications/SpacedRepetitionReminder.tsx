"use client";

import React from "react";

export interface SpacedRepetitionReminderProps {
  dueCards?: number;
  onReview?: () => void;
}

export function SpacedRepetitionReminder({
  dueCards = 0,
  onReview,
}: SpacedRepetitionReminderProps) {
  return (
    <div className="spaced-repetition-reminder">
      <p>You have {dueCards} cards due for review</p>
      <button onClick={onReview}>Review Now</button>
    </div>
  );
}

export default SpacedRepetitionReminder;
