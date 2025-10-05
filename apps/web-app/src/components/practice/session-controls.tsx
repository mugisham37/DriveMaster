"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface SessionControlsProps {
  canSubmit: boolean;
  isSubmitting: boolean;
  showExplanation: boolean;
  onSubmit: (confidence?: number) => void;
  onNext: () => void;
  onEndSession: () => void;
}

export function SessionControls({
  canSubmit,
  isSubmitting,
  showExplanation,
  onSubmit,
  onNext,
  onEndSession,
}: SessionControlsProps) {
  const [showConfidence, setShowConfidence] = useState(false);
  const [selectedConfidence, setSelectedConfidence] = useState(3);

  const handleSubmit = () => {
    if (showConfidence) {
      onSubmit(selectedConfidence);
      setShowConfidence(false);
    } else {
      setShowConfidence(true);
    }
  };

  const confidenceLabels = {
    1: "Very Unsure",
    2: "Unsure",
    3: "Neutral",
    4: "Confident",
    5: "Very Confident",
  };

  if (showExplanation) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={onEndSession}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              End Session
            </Button>

            <Button onClick={onNext} className="bg-blue-600 hover:bg-blue-700">
              Next Question →
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        {!showConfidence ? (
          <div className="flex justify-between items-center">
            <Button
              variant="outline"
              onClick={onEndSession}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              End Session
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  /* TODO: Skip functionality */
                }}
                disabled={isSubmitting}
              >
                Skip
              </Button>

              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || isSubmitting}
                loading={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? "Submitting..." : "Submit Answer"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                How confident are you in your answer?
              </h3>
              <p className="text-sm text-gray-600">
                This helps us better understand your learning progress.
              </p>
            </div>

            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  onClick={() => setSelectedConfidence(level)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedConfidence === level
                      ? "bg-blue-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>

            <div className="text-center text-sm text-gray-600">
              {
                confidenceLabels[
                  selectedConfidence as keyof typeof confidenceLabels
                ]
              }
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setShowConfidence(false)}
              >
                Back
              </Button>

              <Button
                onClick={handleSubmit}
                loading={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? "Submitting..." : "Submit with Confidence"}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
