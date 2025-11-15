/**
 * Learning Preferences Step Component
 * 
 * Third step - learning difficulty, pace, and goals (optional)
 * Requirements: 2.5
 */

"use client";

import React from "react";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { BookOpen, Zap, Target, Bell } from "lucide-react";

export function LearningPreferencesStep() {
  const { formData, setFormData } = useOnboarding();

  const difficulty = formData.learningPreferences?.difficulty || 'beginner';
  const pace = formData.learningPreferences?.pace || 'normal';
  const dailyGoal = formData.learningPreferences?.dailyGoalMinutes || 30;
  const weeklyGoal = formData.learningPreferences?.weeklyGoalMinutes || 210;
  const reminders = formData.learningPreferences?.reminders ?? true;

  const setLearningPref = (key: string, value: unknown) => {
    setFormData({
      learningPreferences: {
        ...formData.learningPreferences,
        [key]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Learning Preferences
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          Customize your learning experience (optional)
        </p>
      </div>

      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Difficulty Level */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Difficulty Level
          </Label>
          <div className="grid grid-cols-3 gap-3">
            {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
              <button
                key={level}
                onClick={() => setLearningPref('difficulty', level)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  difficulty === level
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">
                    {level === 'beginner' && '🌱'}
                    {level === 'intermediate' && '🌿'}
                    {level === 'advanced' && '🌳'}
                  </div>
                  <div className="font-medium capitalize">{level}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Learning Pace */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Learning Pace
          </Label>
          <div className="grid grid-cols-3 gap-3">
            {(['slow', 'normal', 'fast'] as const).map((speed) => (
              <button
                key={speed}
                onClick={() => setLearningPref('pace', speed)}
                className={`p-4 rounded-lg border-2 transition-all ${
                  pace === speed
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">
                    {speed === 'slow' && '🐢'}
                    {speed === 'normal' && '🚶'}
                    {speed === 'fast' && '🏃'}
                  </div>
                  <div className="font-medium capitalize">
                    {speed === 'slow' && 'Relaxed'}
                    {speed === 'normal' && 'Moderate'}
                    {speed === 'fast' && 'Intensive'}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Study Goals */}
        <div className="space-y-4">
          <Label className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Study Time Goals
          </Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dailyGoal" className="text-sm">
                Daily Goal (minutes)
              </Label>
              <Input
                id="dailyGoal"
                type="number"
                min="5"
                max="480"
                value={dailyGoal}
                onChange={(e) => setLearningPref('dailyGoalMinutes', parseInt(e.target.value) || 30)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weeklyGoal" className="text-sm">
                Weekly Goal (minutes)
              </Label>
              <Input
                id="weeklyGoal"
                type="number"
                min="30"
                max="3360"
                value={weeklyGoal}
                onChange={(e) => setLearningPref('weeklyGoalMinutes', parseInt(e.target.value) || 210)}
                className="w-full"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Recommended: {dailyGoal} min/day = {Math.round(dailyGoal * 7)} min/week
          </p>
        </div>

        {/* Reminders */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <div>
              <Label htmlFor="reminders" className="font-medium">
                Study Reminders
              </Label>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Get daily reminders to stay on track
              </p>
            </div>
          </div>
          <Switch
            id="reminders"
            checked={reminders}
            onCheckedChange={(checked) => setLearningPref('reminders', checked)}
          />
        </div>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 max-w-2xl mx-auto">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          ℹ️ <strong>Note:</strong> These preferences help us personalize your experience. 
          You can skip this step and set them later in your settings.
        </p>
      </div>
    </div>
  );
}
