"use client";

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Share2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface AchievementNotificationProps {
  achievement: {
    name: string;
    description: string;
    icon?: string;
    points?: number;
    rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    badgeUrl?: string;
    shareUrl?: string;
  };
  onShare?: (platform: string) => void;
  onDismiss?: () => void;
  autoShow?: boolean;
  className?: string;
}

const rarityColors = {
  common: 'from-gray-400 to-gray-600',
  uncommon: 'from-green-400 to-green-600',
  rare: 'from-blue-400 to-blue-600',
  epic: 'from-purple-400 to-purple-600',
  legendary: 'from-yellow-400 to-yellow-600',
};

const rarityGlow = {
  common: 'shadow-gray-500/50',
  uncommon: 'shadow-green-500/50',
  rare: 'shadow-blue-500/50',
  epic: 'shadow-purple-500/50',
  legendary: 'shadow-yellow-500/50',
};

export function AchievementNotification({
  achievement,
  onShare,
  onDismiss,
  autoShow = true,
  className = "",
}: AchievementNotificationProps) {
  const [isOpen, setIsOpen] = useState(autoShow);
  const [showConfetti, setShowConfetti] = useState(false);
  const [countdown, setCountdown] = useState(10);

  const rarity = achievement.rarity || 'common';

  useEffect(() => {
    if (isOpen) {
      // Trigger confetti animation
      setShowConfetti(true);
      const confettiTimer = setTimeout(() => setShowConfetti(false), 3000);

      // Auto-dismiss countdown
      const countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            handleClose();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        clearTimeout(confettiTimer);
        clearInterval(countdownInterval);
      };
    }
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
    onDismiss?.();
  };

  const handleShare = (platform: string) => {
    onShare?.(platform);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent 
            className={`max-w-md ${className}`}
            aria-describedby="achievement-description"
          >
            {/* Confetti Effect */}
            {showConfetti && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(30)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 rounded-full"
                    style={{
                      background: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'][i % 5],
                      left: `${Math.random() * 100}%`,
                      top: '-10px',
                    }}
                    animate={{
                      y: [0, 400],
                      x: [0, (Math.random() - 0.5) * 200],
                      rotate: [0, Math.random() * 360],
                      opacity: [1, 0],
                    }}
                    transition={{
                      duration: 2 + Math.random(),
                      ease: "easeOut",
                    }}
                  />
                ))}
              </div>
            )}

            <DialogHeader>
              <DialogTitle className="sr-only">Achievement Unlocked</DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-4"
                onClick={handleClose}
                aria-label="Close achievement notification"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogHeader>

            <div className="flex flex-col items-center text-center space-y-4 py-6">
              {/* Achievement Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className={`relative w-24 h-24 rounded-full bg-gradient-to-br ${rarityColors[rarity]} ${rarityGlow[rarity]} shadow-2xl flex items-center justify-center`}
              >
                {achievement.badgeUrl ? (
                  <img 
                    src={achievement.badgeUrl} 
                    alt={achievement.name}
                    className="w-16 h-16 object-contain"
                  />
                ) : (
                  <Trophy className="w-16 h-16 text-white" />
                )}
              </motion.div>

              {/* Achievement Details */}
              <div className="space-y-2">
                <Badge variant="secondary" className="text-xs uppercase">
                  {rarity} Achievement
                </Badge>
                <h3 className="text-2xl font-bold">{achievement.name}</h3>
                <p id="achievement-description" className="text-muted-foreground">
                  {achievement.description}
                </p>
              </div>

              {/* Points Badge */}
              {achievement.points && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center gap-2 text-lg font-semibold"
                >
                  <span className="text-yellow-500">+{achievement.points}</span>
                  <span className="text-muted-foreground">points</span>
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 w-full pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleShare('native')}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleClose}
                >
                  View Achievement
                </Button>
              </div>

              {/* Auto-dismiss Countdown */}
              <p className="text-xs text-muted-foreground">
                Auto-closing in {countdown}s
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AnimatePresence>
  );
}

export default AchievementNotification;
