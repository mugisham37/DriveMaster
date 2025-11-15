/**
 * Celebration Animation Component
 * Task 18.4: Add success feedback improvements
 * 
 * Celebration animations for achievements and milestones
 * Confetti, fireworks, and other success animations
 * Respects prefers-reduced-motion
 */

'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, Trophy, Star, Sparkles, Zap } from 'lucide-react';

export interface CelebrationAnimationProps {
  /**
   * Type of celebration
   */
  type?: 'confetti' | 'fireworks' | 'sparkles' | 'pulse' | 'bounce';
  
  /**
   * Duration in milliseconds
   */
  duration?: number;
  
  /**
   * Whether to show the animation
   */
  show?: boolean;
  
  /**
   * Callback when animation completes
   */
  onComplete?: () => void;
}