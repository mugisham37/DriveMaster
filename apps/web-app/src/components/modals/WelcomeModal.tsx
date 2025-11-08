"use client";

import React from "react";

interface WelcomeModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  userName?: string;
  numTracks?: number;
}

export function WelcomeModal({ isOpen = false, onClose = () => {}, userName, numTracks }: WelcomeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">
          Welcome to DriveMaster{userName ? `, ${userName}` : ""}!
        </h2>
        <p className="text-gray-600 mb-4">
          Get started on your journey to becoming a better driver with our comprehensive learning platform{numTracks ? ` featuring ${numTracks} tracks` : ""}.
        </p>
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Get Started
        </button>
      </div>
    </div>
  );
}
