/**
 * Achievement Modal Component
 * 
 * Displays detailed achievement information in a modal
 * 
 * Requirements: 10.4
 */

import React, { useState, useEffect } from 'react';
import { Trophy, X, Calendar, Award } from 'lucide-react';
import type { Milestone } from '@/types/user-service';

export interface AchievementModalProps {
  achievement: Milestone | null;
  isOpen: boolean;
  onClose: () => void;
}

export function AchievementModal({ achievement, isOpen, onClose }: AchievementModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsVisible(true), 10);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  if (!achievement || !isOpen) {
    return null;
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-200 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={`relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${
            isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-5'
          }`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="achievement-modal-title"
        >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors z-10"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>

              {/* Header with celebration background */}
              <div className="relative bg-gradient-to-br from-yellow-400 via-amber-400 to-orange-400 dark:from-yellow-600 dark:via-amber-600 dark:to-orange-600 p-8 text-center overflow-hidden">
                {/* Trophy icon */}
                <div className="relative inline-flex items-center justify-center w-20 h-20 bg-white dark:bg-gray-800 rounded-full shadow-lg mb-4 animate-bounce-in">
                  <Trophy className="w-10 h-10 text-yellow-500" />
                </div>

                {/* Title */}
                <h2
                  id="achievement-modal-title"
                  className="text-2xl font-bold text-white mb-2 animate-fade-in"
                  style={{ animationDelay: '100ms' }}
                >
                  Achievement Unlocked!
                </h2>

                <p
                  className="text-white/90 text-sm animate-fade-in"
                  style={{ animationDelay: '200ms' }}
                >
                  Congratulations on your progress!
                </p>
              </div>

              <style jsx>{`
                @keyframes bounce-in {
                  0% {
                    transform: scale(0) rotate(-180deg);
                  }
                  50% {
                    transform: scale(1.1) rotate(10deg);
                  }
                  100% {
                    transform: scale(1) rotate(0deg);
                  }
                }
                @keyframes fade-in {
                  from {
                    opacity: 0;
                    transform: translateY(10px);
                  }
                  to {
                    opacity: 1;
                    transform: translateY(0);
                  }
                }
                .animate-bounce-in {
                  animation: bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
                }
                .animate-fade-in {
                  animation: fade-in 0.3s ease-out forwards;
                  opacity: 0;
                }
              `}</style>

              {/* Content */}
              <div className="p-6 space-y-4">
                {/* Achievement title */}
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    {achievement.title}
                  </h3>
                  {achievement.description && (
                    <p className="text-gray-600 dark:text-gray-400">
                      {achievement.description}
                    </p>
                  )}
                </div>

                {/* Achievement details */}
                <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  {/* Type */}
                  <div className="flex items-center gap-3 text-sm">
                    <Award className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">Type:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                      {achievement.type}
                    </span>
                  </div>

                  {/* Achievement date */}
                  {achievement.achievedAt && (
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">Unlocked:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {new Date(achievement.achievedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  )}

                  {/* Progress */}
                  <div className="flex items-center gap-3 text-sm">
                    <Trophy className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">Progress:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {achievement.value} / {achievement.target}
                    </span>
                  </div>
                </div>

                {/* Action button */}
                <button
                  onClick={onClose}
                  className="w-full py-3 px-4 bg-gradient-to-r from-yellow-400 to-amber-400 hover:from-yellow-500 hover:to-amber-500 dark:from-yellow-600 dark:to-amber-600 dark:hover:from-yellow-700 dark:hover:to-amber-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Awesome!
                </button>
              </div>
        </div>
      </div>
    </>
  );
}
