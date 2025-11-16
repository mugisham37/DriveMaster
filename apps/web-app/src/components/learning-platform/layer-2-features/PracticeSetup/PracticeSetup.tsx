"use client";

/**
 * PracticeSetup Component
 * 
 * Setup interface for practice sessions with topic selection and settings
 * Requirements: 7.1, 7.2
 */

import React, { useState, useEffect } from 'react';
import { useContentItems } from '@/hooks/use-content-operations';
import { useProgress } from '@/contexts/ProgressContext';
import { TopicBadge } from '../../layer-3-ui';

export interface PracticeSettings {
  topics: string[];
  difficulty: number; // IRT scale (-3 to 3)
  questionCount: number | 'unlimited';
  timed: boolean;
  timeLimit?: number; // minutes
}

export interface PracticeSetupProps {
  onStart: (settings: PracticeSettings) => void;
  onCancel?: () => void;
}

export function PracticeSetup({ onStart, onCancel }: PracticeSetupProps) {
  const { items: topics, isLoading } = useContentItems({ type: 'topic' });
  const { state: progressState, skillMasteries } = useProgress();

  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [difficulty, setDifficulty] = useState<number>(0);
  const [questionCount, setQuestionCount] = useState<number | 'unlimited'>(20);
  const [timed, setTimed] = useState(false);
  const [timeLimit, setTimeLimit] = useState(30);

  // Get recommended topics (low mastery)
  const recommendedTopics = Array.from(skillMasteries.values())
    .filter((mastery) => mastery.mastery < 50)
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, 3)
    .map((mastery) => mastery.topic);

  // Auto-select recommended topics on mount
  useEffect(() => {
    if (recommendedTopics.length > 0 && selectedTopics.length === 0) {
      setSelectedTopics(recommendedTopics);
    }
  }, [recommendedTopics.length]);

  const handleTopicToggle = (topic: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topic)
        ? prev.filter((t) => t !== topic)
        : [...prev, topic]
    );
  };

  const handleStart = () => {
    if (selectedTopics.length === 0) {
      alert('Please select at least one topic');
      return;
    }

    const settings: PracticeSettings = {
      topics: selectedTopics,
      difficulty,
      questionCount,
      timed,
      ...(timed && { timeLimit }),
    };

    onStart(settings);
  };

  const getDifficultyLabel = (value: number): string => {
    if (value <= -2) return 'Very Easy';
    if (value <= -1) return 'Easy';
    if (value <= 1) return 'Medium';
    if (value <= 2) return 'Hard';
    return 'Very Hard';
  };

  const getMasteryLevel = (topic: string): number => {
    const mastery = skillMasteries.get(topic);
    return mastery?.mastery || 0;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading topics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Practice Setup</h1>
        <p className="text-muted-foreground">
          Customize your practice session to focus on specific topics and difficulty levels
        </p>
      </div>

      {/* Recommended Settings */}
      {recommendedTopics.length > 0 && (
        <div className="p-6 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <svg
                className="w-5 h-5 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold mb-1">Recommended for You</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Based on your progress, we recommend practicing these topics:
              </p>
              <div className="flex flex-wrap gap-2">
                {recommendedTopics.map((topic) => (
                  <TopicBadge
                    key={topic}
                    topic={topic}
                    masteryLevel={getMasteryLevel(topic)}
                    showMastery={true}
                    size="md"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Topic Selection */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold mb-1">Select Topics</h2>
          <p className="text-sm text-muted-foreground">
            Choose one or more topics to practice
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {topics.map((topic) => {
            const isSelected = selectedTopics.includes(topic.title);
            const masteryLevel = getMasteryLevel(topic.title);
            const isRecommended = recommendedTopics.includes(topic.title);

            return (
              <button
                key={topic.id}
                onClick={() => handleTopicToggle(topic.title)}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                } ${isRecommended ? 'ring-2 ring-primary/20' : ''}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium">{topic.title}</h3>
                  {isSelected && (
                    <svg
                      className="w-5 h-5 text-primary flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        masteryLevel >= 80
                          ? 'bg-green-500'
                          : masteryLevel >= 50
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${masteryLevel}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {masteryLevel}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Difficulty Slider */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold mb-1">Difficulty Level</h2>
          <p className="text-sm text-muted-foreground">
            Adjust the difficulty of questions (IRT scale)
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {getDifficultyLabel(difficulty)}
            </span>
            <span className="text-sm text-muted-foreground">
              IRT: {difficulty.toFixed(1)}
            </span>
          </div>
          <input
            type="range"
            min="-3"
            max="3"
            step="0.5"
            value={difficulty}
            onChange={(e) => setDifficulty(parseFloat(e.target.value))}
            className="w-full"
            aria-label="Difficulty level"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Very Easy</span>
            <span>Medium</span>
            <span>Very Hard</span>
          </div>
        </div>
      </div>

      {/* Question Count */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold mb-1">Number of Questions</h2>
          <p className="text-sm text-muted-foreground">
            How many questions do you want to practice?
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[10, 20, 50, 'unlimited'].map((count) => (
            <button
              key={count}
              onClick={() => setQuestionCount(count as number | 'unlimited')}
              className={`p-4 border-2 rounded-lg font-medium transition-all ${
                questionCount === count
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              {count === 'unlimited' ? 'Unlimited' : `${count} Questions`}
            </button>
          ))}
        </div>
      </div>

      {/* Timer Toggle */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold mb-1">Timer</h2>
          <p className="text-sm text-muted-foreground">
            Add a time limit to your practice session
          </p>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={timed}
              onChange={(e) => setTimed(e.target.checked)}
              className="w-5 h-5 rounded"
            />
            <span className="font-medium">Enable Timer</span>
          </label>

          {timed && (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={timeLimit}
                onChange={(e) => setTimeLimit(parseInt(e.target.value) || 30)}
                min="5"
                max="120"
                className="w-20 px-3 py-2 border rounded-md"
              />
              <span className="text-sm text-muted-foreground">minutes</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-6 border-t">
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-6 py-3 border rounded-md hover:bg-muted"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleStart}
          disabled={selectedTopics.length === 0}
          className="px-8 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 font-medium disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
        >
          Start Practice
        </button>
      </div>
    </div>
  );
}
