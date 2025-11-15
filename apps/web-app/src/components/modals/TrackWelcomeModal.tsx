"use client";

import React from "react";
import Image from "next/image";

interface TrackWelcomeModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  track?: {
    slug: string;
    title: string;
    iconUrl: string;
  };
  userSeniority?: string;
  userJoinedDaysAgo?: number;
}

export default function TrackWelcomeModal({ 
  isOpen = false, 
  onClose = () => {}, 
  track,
  userSeniority,
  userJoinedDaysAgo
}: TrackWelcomeModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">
          Welcome to {track?.title || "this track"}!
        </h2>
        {track?.iconUrl && (
          <Image 
            src={track.iconUrl} 
            alt={track.title} 
            width={64}
            height={64}
            className="mb-4"
          />
        )}
        <p className="text-gray-600 mb-4">
          Start your learning journey with this track{userSeniority ? ` at ${userSeniority} level` : ""}{userJoinedDaysAgo !== undefined ? ` (Day ${userJoinedDaysAgo})` : ""}.
        </p>
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Start Learning
        </button>
      </div>
    </div>
  );
}
