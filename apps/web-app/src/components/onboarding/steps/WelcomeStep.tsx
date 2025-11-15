/**
 * Welcome Step Component
 * 
 * First step of onboarding - greeting and introduction
 * Requirements: 2.2
 */

"use client";

import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { Sparkles } from "lucide-react";

export function WelcomeStep() {
  const { user } = useAuth();

  return (
    <div className="text-center space-y-6">
      <div className="flex justify-center">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Welcome to Your Learning Journey!
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          {user?.email}
        </p>
      </div>

      <div className="max-w-2xl mx-auto space-y-4 text-left">
        <p className="text-gray-700 dark:text-gray-300">
          We're excited to have you here! Let's take a few moments to personalize your experience.
        </p>

        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 space-y-2">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            What we'll set up:
          </h3>
          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li className="flex items-start">
              <span className="mr-2">🌍</span>
              <span>Your timezone and language preferences</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">📚</span>
              <span>Learning preferences and goals (optional)</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">🔔</span>
              <span>Notification and privacy settings</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✅</span>
              <span>Review and confirm your choices</span>
            </li>
          </ul>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400">
          This will only take 2-3 minutes, and you can always change these settings later.
        </p>
      </div>
    </div>
  );
}
