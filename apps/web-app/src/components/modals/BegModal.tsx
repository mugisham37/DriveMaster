"use client";

import React from "react";

interface BegModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  previousDonor?: boolean;
}

export function BegModal({ isOpen = false, onClose = () => {}, previousDonor = false }: BegModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">
          {previousDonor ? "Thank You for Your Support!" : "Support Our Platform"}
        </h2>
        <p className="text-gray-600 mb-4">
          {previousDonor 
            ? "Your previous donations have helped us keep DriveMaster free and accessible. Consider supporting us again!"
            : "Help us keep DriveMaster free and accessible for everyone."}
        </p>
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Close
        </button>
      </div>
    </div>
  );
}
