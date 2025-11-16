'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChoiceButton } from '../ChoiceButton';
import { Button } from '@/components/ui/button';
import { Maximize2 } from 'lucide-react';
import type { Question } from '@/types/learning-platform';

interface QuestionDisplayProps {
  question: Question;
  selectedChoiceId?: string;
  showFeedback?: boolean;
  isDisabled?: boolean;
  isReview?: boolean;
  onChoiceSelect: (choiceId: string) => void;
  onSubmit?: () => void;
  className?: string;
}

export function QuestionDisplay({
  question,
  selectedChoiceId,
  showFeedback = false,
  isDisabled = false,
  isReview = false,
  onChoiceSelect,
  onSubmit,
  className,
}: QuestionDisplayProps) {
  const [expandedMedia, setExpandedMedia] = useState<string | null>(null);

  const hasMedia = question.mediaAssets && question.mediaAssets.length > 0;
  const canSubmit = selectedChoiceId && !showFeedback && onSubmit;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Review Badge */}
      {isReview && (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 border border-blue-300 rounded-md text-sm font-medium">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Review Question
        </div>
      )}
      
      {/* Question Text */}
      <div className="prose prose-sm max-w-none">
        <p className="text-lg font-medium text-gray-900 leading-relaxed">
          {question.text}
        </p>
      </div>

      {/* Media Gallery */}
      {hasMedia && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {question.mediaAssets?.map((assetId) => (
            <div
              key={assetId}
              className="relative group rounded-lg overflow-hidden border border-gray-200"
            >
              <img
                src={`/api/media/${assetId}`}
                alt="Question media"
                className="w-full h-auto"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setExpandedMedia(assetId)}
                >
                  <Maximize2 className="w-4 h-4 mr-1" />
                  Fullscreen
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Choices */}
      <div className="space-y-3" role="radiogroup" aria-label="Answer choices">
        {question.choices.map((choice) => {
          const isSelected = selectedChoiceId === choice.id;
          const isCorrect = showFeedback && choice.isCorrect;
          const isIncorrect = showFeedback && isSelected && !choice.isCorrect;

          return (
            <ChoiceButton
              key={choice.id}
              choiceId={choice.id}
              text={choice.text}
              isSelected={isSelected}
              isCorrect={isCorrect}
              isIncorrect={isIncorrect}
              isDisabled={isDisabled}
              showFeedback={showFeedback}
              onClick={onChoiceSelect}
            />
          );
        })}
      </div>

      {/* Submit Button */}
      {canSubmit && (
        <div className="flex justify-end pt-4">
          <Button
            size="lg"
            onClick={onSubmit}
            disabled={!selectedChoiceId}
            className="min-w-32"
          >
            Submit Answer
          </Button>
        </div>
      )}

      {/* Explanation (shown after feedback) */}
      {showFeedback && question.explanation && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">Explanation</h4>
          <p className="text-sm text-blue-800 leading-relaxed">
            {question.explanation}
          </p>
        </div>
      )}

      {/* External References */}
      {showFeedback && question.externalReferences && question.externalReferences.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-semibold text-gray-700">Learn More:</h4>
          <ul className="space-y-1">
            {question.externalReferences.map((ref, index) => (
              <li key={index}>
                <a
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  {ref.title} ({ref.type})
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Fullscreen Media Modal */}
      {expandedMedia && (
        <div
          className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center p-4"
          onClick={() => setExpandedMedia(null)}
        >
          <img
            src={`/api/media/${expandedMedia}`}
            alt="Expanded media"
            className="max-w-full max-h-full object-contain"
          />
          <Button
            variant="secondary"
            className="absolute top-4 right-4"
            onClick={() => setExpandedMedia(null)}
          >
            Close
          </Button>
        </div>
      )}
    </div>
  );
}
