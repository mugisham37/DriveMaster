"use client";

import { Item } from "@/types/practice";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { clsx } from "clsx";

interface ExplanationModalProps {
  item: Item;
  selectedAnswer: string | string[] | null;
  isCorrect: boolean;
  explanation?: {
    text: string;
    richText?: string;
  };
  onNext: () => void;
  onClose: () => void;
}

export function ExplanationModal({
  item,
  selectedAnswer,
  isCorrect,
  explanation,
  onNext,
  onClose,
}: ExplanationModalProps) {
  const getSelectedChoice = () => {
    if (!selectedAnswer) return null;
    const answerId = Array.isArray(selectedAnswer)
      ? selectedAnswer[0]
      : selectedAnswer;
    return item.choices.find((choice) => choice.id === answerId);
  };

  const getCorrectChoice = () => {
    const correctId = Array.isArray(item.correct)
      ? item.correct[0]
      : item.correct;
    return item.choices.find((choice) => choice.id === correctId);
  };

  const selectedChoice = getSelectedChoice();
  const correctChoice = getCorrectChoice();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {isCorrect ? (
                <>
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <span className="text-green-700">Correct!</span>
                </>
              ) : (
                <>
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-5 h-5 text-red-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </div>
                  <span className="text-red-700">Incorrect</span>
                </>
              )}
            </CardTitle>

            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Answer Summary */}
          <div className="space-y-3">
            {selectedChoice && (
              <div
                className={clsx(
                  "p-4 rounded-lg border-2",
                  isCorrect
                    ? "bg-green-50 border-green-200"
                    : "bg-red-50 border-red-200"
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={clsx(
                      "flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-medium",
                      isCorrect
                        ? "border-green-500 bg-green-500 text-white"
                        : "border-red-500 bg-red-500 text-white"
                    )}
                  >
                    {String.fromCharCode(
                      65 +
                        item.choices.findIndex(
                          (c) => c.id === selectedChoice.id
                        )
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 mb-1">
                      Your Answer:
                    </p>
                    <p className="text-gray-700">{selectedChoice.text}</p>
                  </div>
                </div>
              </div>
            )}

            {!isCorrect && correctChoice && (
              <div className="p-4 rounded-lg border-2 bg-green-50 border-green-200">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-green-500 bg-green-500 text-white flex items-center justify-center text-sm font-medium">
                    {String.fromCharCode(
                      65 +
                        item.choices.findIndex((c) => c.id === correctChoice.id)
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 mb-1">
                      Correct Answer:
                    </p>
                    <p className="text-gray-700">{correctChoice.text}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Explanation */}
          {(explanation || item.explanation) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Explanation
              </h3>
              <div className="prose prose-sm max-w-none text-blue-800">
                {explanation?.richText ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: explanation.richText }}
                  />
                ) : explanation?.text ? (
                  <p>{explanation.text}</p>
                ) : item.explanation?.richText ? (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: item.explanation.richText,
                    }}
                  />
                ) : (
                  <p>{item.explanation?.text}</p>
                )}
              </div>
            </div>
          )}

          {/* Learning Tips */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-medium text-yellow-900 mb-2 flex items-center gap-2">
              <svg
                className="w-5 h-5"
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
              Learning Tip
            </h3>
            <p className="text-yellow-800 text-sm">
              {isCorrect
                ? `Great job! This ${
                    item.cognitiveLevel
                  }-level question tested your understanding of ${item.topics.join(
                    ", "
                  )}. Keep practicing similar concepts to reinforce your knowledge.`
                : `This ${
                    item.cognitiveLevel
                  }-level question focuses on ${item.topics.join(
                    ", "
                  )}. Review the explanation above and consider practicing more questions on this topic.`}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={onClose}>
              Review Question
            </Button>

            <Button onClick={onNext} className="bg-blue-600 hover:bg-blue-700">
              Continue →
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
