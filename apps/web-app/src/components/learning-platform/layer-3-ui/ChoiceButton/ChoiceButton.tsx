'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';

interface ChoiceButtonProps {
  choiceId: string;
  text: string;
  isSelected: boolean;
  isCorrect?: boolean;
  isIncorrect?: boolean;
  isDisabled?: boolean;
  showFeedback?: boolean;
  onClick: (choiceId: string) => void;
  className?: string;
}

export function ChoiceButton({
  choiceId,
  text,
  isSelected,
  isCorrect,
  isIncorrect,
  isDisabled = false,
  showFeedback = false,
  onClick,
  className,
}: ChoiceButtonProps) {
  const handleClick = () => {
    if (!isDisabled) {
      onClick(choiceId);
    }
  };

  const getButtonClasses = () => {
    if (showFeedback) {
      if (isCorrect) {
        return 'border-green-500 bg-green-50 text-green-900 hover:bg-green-100';
      }
      if (isIncorrect) {
        return 'border-red-500 bg-red-50 text-red-900 hover:bg-red-100';
      }
    }

    if (isSelected) {
      return 'border-blue-500 bg-blue-50 text-blue-900 hover:bg-blue-100';
    }

    return 'border-gray-300 bg-white text-gray-900 hover:bg-gray-50 hover:border-gray-400';
  };

  return (
    <Button
      variant="outline"
      className={cn(
        'w-full justify-start text-left h-auto py-4 px-4 transition-all',
        'focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        getButtonClasses(),
        isDisabled && 'opacity-60 cursor-not-allowed',
        className
      )}
      onClick={handleClick}
      disabled={isDisabled}
      aria-pressed={isSelected}
      aria-label={`Choice: ${text}`}
    >
      <div className="flex items-start gap-3 w-full">
        <div
          className={cn(
            'flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5',
            isSelected && !showFeedback && 'border-blue-500 bg-blue-500',
            showFeedback && isCorrect && 'border-green-500 bg-green-500',
            showFeedback && isIncorrect && 'border-red-500 bg-red-500',
            !isSelected && !showFeedback && 'border-gray-400'
          )}
        >
          {showFeedback && isCorrect && <Check className="w-3 h-3 text-white" />}
          {showFeedback && isIncorrect && <X className="w-3 h-3 text-white" />}
          {isSelected && !showFeedback && (
            <div className="w-2 h-2 rounded-full bg-white" />
          )}
        </div>
        <span className="flex-1 text-sm leading-relaxed">{text}</span>
      </div>
    </Button>
  );
}
