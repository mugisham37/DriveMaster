"use client";

import React, { useState } from "react";

interface SenioritySurveyModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSubmit?: (level: string) => void;
}

export function SenioritySurveyModal({ 
  isOpen = false, 
  onClose = () => {}, 
  onSubmit = () => {}
}: SenioritySurveyModalProps) {
  const [selectedLevel, setSelectedLevel] = useState("");

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (selectedLevel) {
      onSubmit(selectedLevel);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">What&apos;s your experience level?</h2>
        <div className="space-y-2 mb-4">
          {["Beginner", "Intermediate", "Advanced"].map((level) => (
            <label key={level} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="level"
                value={level}
                checked={selectedLevel === level}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="form-radio"
              />
              <span>{level}</span>
            </label>
          ))}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedLevel}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}
