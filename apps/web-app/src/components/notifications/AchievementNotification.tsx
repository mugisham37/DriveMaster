"use client";

import React from "react";

export interface AchievementNotificationProps {
  achievement?: {
    title: string;
    description: string;
  };
  onClose?: () => void;
}

export function AchievementNotification({
  achievement,
  onClose,
}: AchievementNotificationProps) {
  return (
    <div className="achievement-notification">
      <h4>{achievement?.title || "Achievement Unlocked!"}</h4>
      <p>{achievement?.description || "Congratulations!"}</p>
      <button onClick={onClose}>Close</button>
    </div>
  );
}

export default AchievementNotification;
