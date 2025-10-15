"use client";

import { useState } from "react";
import Image from "next/image";
import { Item, Choice } from "@/types/practice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { clsx } from "clsx";

interface QuestionDisplayProps {
  item: Item;
  selectedAnswer: string | string[] | null;
  onAnswerSelect: (answer: string | string[]) => void;
  disabled?: boolean;
  showHints?: boolean;
}

export function QuestionDisplay({
  item,
  selectedAnswer,
  onAnswerSelect,
  disabled = false,
  showHints = true,
}: QuestionDisplayProps) {
  const [showHint, setShowHint] = useState(false);

  const handleChoiceSelect = (choiceId: string) => {
    if (disabled) return;

    if (item.itemType === "multiple_choice") {
      // Single selection for multiple choice
      onAnswerSelect(choiceId);
    } else {
      // Handle other types if needed
      onAnswerSelect(choiceId);
    }
  };

  const isSelected = (choiceId: string) => {
    if (Array.isArray(selectedAnswer)) {
      return selectedAnswer.includes(choiceId);
    }
    return selectedAnswer === choiceId;
  };

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty < -1) return "text-green-600 bg-green-50";
    if (difficulty < 0) return "text-yellow-600 bg-yellow-50";
    if (difficulty < 1) return "text-orange-600 bg-orange-50";
    return "text-red-600 bg-red-50";
  };

  const getDifficultyLabel = (difficulty: number) => {
    if (difficulty < -1) return "Easy";
    if (difficulty < 0) return "Medium";
    if (difficulty < 1) return "Hard";
    return "Very Hard";
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Question</CardTitle>
          <div className="flex items-center gap-2">
            {/* Difficulty indicator */}
            <span
              className={clsx(
                "px-2 py-1 rounded-full text-xs font-medium",
                getDifficultyColor(item.difficulty)
              )}
            >
              {getDifficultyLabel(item.difficulty)}
            </span>

            {/* Topics */}
            <div className="flex gap-1">
              {item.topics.slice(0, 2).map((topic) => (
                <span
                  key={topic}
                  className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
                >
                  {topic}
                </span>
              ))}
              {item.topics.length > 2 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                  +{item.topics.length - 2}
                </span>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Question Text */}
        <div className="prose max-w-none">
          {item.content.richText ? (
            <div dangerouslySetInnerHTML={{ __html: item.content.richText }} />
          ) : (
            <p className="text-lg leading-relaxed">{item.content.text}</p>
          )}
        </div>

        {/* Media */}
        {item.mediaRefs.length > 0 && (
          <div className="space-y-4">
            {item.mediaRefs.map((media) => (
              <div key={media.id} className="rounded-lg overflow-hidden">
                {media.type === "image" && (
                  <div className="relative">
                    <Image
                      src={media.url}
                      alt={media.alt || "Question image"}
                      width={800}
                      height={400}
                      className="w-full h-auto max-h-96 object-contain bg-gray-50"
                    />
                    {media.caption && (
                      <p className="text-sm text-gray-600 mt-2 italic">
                        {media.caption}
                      </p>
                    )}
                  </div>
                )}
                {media.type === "video" && (
                  <video
                    controls
                    className="w-full max-h-96"
                    poster={media.alt}
                  >
                    <source src={media.url} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                )}
                {media.type === "audio" && (
                  <audio controls className="w-full">
                    <source src={media.url} type="audio/mpeg" />
                    Your browser does not support the audio tag.
                  </audio>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Answer Choices */}
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900">Select your answer:</h3>
          <div className="space-y-2">
            {item.choices.map((choice, index) => (
              <button
                key={choice.id}
                onClick={() => handleChoiceSelect(choice.id)}
                disabled={disabled}
                className={clsx(
                  "w-full p-4 text-left border-2 rounded-lg transition-all duration-200",
                  "hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                  isSelected(choice.id)
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 bg-white",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={clsx(
                      "flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-medium",
                      isSelected(choice.id)
                        ? "border-blue-500 bg-blue-500 text-white"
                        : "border-gray-300 text-gray-500"
                    )}
                  >
                    {String.fromCharCode(65 + index)}
                  </div>
                  <div className="flex-1">
                    {choice.richText ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: choice.richText }}
                      />
                    ) : (
                      <p className="text-gray-900">{choice.text}</p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Hint Section */}
        {showHints && (
          <div className="border-t pt-4">
            {!showHint ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHint(true)}
                className="text-blue-600 hover:text-blue-700"
              >
                💡 Show Hint
              </Button>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <span className="text-yellow-600">💡</span>
                  <div>
                    <p className="text-sm font-medium text-yellow-800 mb-1">
                      Hint:
                    </p>
                    <p className="text-sm text-yellow-700">
                      Consider the {item.cognitiveLevel} level of this question
                      and focus on the key concepts related to {item.topics[0]}.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Question Metadata */}
        <div className="text-xs text-gray-500 border-t pt-4 flex justify-between">
          <span>Estimated time: {item.estimatedTime}s</span>
          <span>Points: {item.points}</span>
        </div>
      </CardContent>
    </Card>
  );
}
