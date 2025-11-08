"use client";

import React from "react";

export interface MockTestReminderProps {
  testName?: string;
  dueDate?: string;
  onStartTest?: () => void;
}

export function MockTestReminder({
  testName,
  dueDate,
  onStartTest,
}: MockTestReminderProps) {
  return (
    <div className="mock-test-reminder">
      <h4>{testName || "Mock Test"}</h4>
      <p>Due: {dueDate || "Soon"}</p>
      <button onClick={onStartTest}>Start Test</button>
    </div>
  );
}

export default MockTestReminder;
