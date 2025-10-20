import React from 'react';

interface Concept {
  id: number;
  slug: string;
  name: string;
}

interface UserTrack {
  id: number;
  slug: string;
  conceptMastered?: (concept: Concept) => boolean;
  numCompletedExercisesForConcept?: (concept: Concept) => number;
  numExercisesForConcept?: (concept: Concept) => number;
}

interface ConceptProgressBarProps {
  concept: Concept;
  userTrack: UserTrack;
  className?: string;
}

export function ConceptProgressBar({ 
  concept, 
  userTrack, 
  className = '' 
}: ConceptProgressBarProps) {
  // Default implementations for missing methods
  const isCompleted = userTrack.conceptMastered?.(concept) ?? false;
  const completedExercises = userTrack.numCompletedExercisesForConcept?.(concept) ?? 0;
  const totalExercises = userTrack.numExercisesForConcept?.(concept) ?? 1;

  const classes = [
    'c-concept-progress-bar',
    isCompleted ? '--completed' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <progress
      className={classes}
      value={completedExercises}
      max={totalExercises}
      aria-label={`Progress for ${concept.name}: ${completedExercises} of ${totalExercises} exercises completed`}
    />
  );
}