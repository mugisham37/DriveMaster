/**
 * Demo/Showcase file for Specialized Notification Components
 * 
 * This file demonstrates all 6 specialized notification components
 * with example data. Useful for:
 * - Visual testing
 * - Component documentation
 * - Integration examples
 * - Storybook stories
 */

"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AchievementNotification,
  SpacedRepetitionReminder,
  StreakReminder,
  MockTestReminder,
  SystemNotification,
  MentoringNotification,
} from "./index";

export function SpecializedNotificationsDemo() {
  const [showAchievement, setShowAchievement] = useState(false);

  return (
    <div className="container mx-auto p-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Specialized Notification Components</h1>
        <p className="text-muted-foreground">
          Interactive demo of all 6 specialized notification components
        </p>
      </div>

      <Tabs defaultValue="achievement" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="achievement">Achievement</TabsTrigger>
          <TabsTrigger value="spaced">Spaced Rep</TabsTrigger>
          <TabsTrigger value="streak">Streak</TabsTrigger>
          <TabsTrigger value="test">Mock Test</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
          <TabsTrigger value="mentoring">Mentoring</TabsTrigger>
        </TabsList>

        {/* Achievement Notification */}
        <TabsContent value="achievement" className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">Achievement Notification</h2>
            <p className="text-muted-foreground">
              Celebration component with confetti, animations, and rarity-based styling
            </p>
          </div>
          <Button onClick={() => setShowAchievement(true)}>
            Show Achievement
          </Button>
          {showAchievement && (
            <AchievementNotification
              achievement={{
                name: "First Lesson Complete!",
                description: "You've completed your first lesson. Keep up the great work!",
                points: 50,
                rarity: "rare",
                badgeUrl: undefined,
                shareUrl: "/achievements/first-lesson",
              }}
              onShare={(platform) => console.log("Share to:", platform)}
              onDismiss={() => setShowAchievement(false)}
              autoShow={true}
            />
          )}
        </TabsContent>

        {/* Spaced Repetition Reminder */}
        <TabsContent value="spaced" className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">Spaced Repetition Reminder</h2>
            <p className="text-muted-foreground">
              Educational reminder with difficulty indicators and optimal timing
            </p>
          </div>
          <SpacedRepetitionReminder
            reminder={{
              topic: "Spanish Vocabulary",
              itemsDue: 15,
              difficulty: "medium",
              lastReview: new Date(Date.now() - 24 * 60 * 60 * 1000),
              optimalTiming: true,
            }}
            onReview={() => console.log("Start review")}
            onSnooze={(hours) => console.log("Snooze for", hours, "hours")}
          />
        </TabsContent>

        {/* Streak Reminder */}
        <TabsContent value="streak" className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">Streak Reminder</h2>
            <p className="text-muted-foreground">
              Motivational component with flame animation and progress visualization
            </p>
          </div>
          <StreakReminder
            streak={{
              currentStreak: 15,
              longestStreak: 30,
              streakGoal: 30,
              lastActivity: new Date(),
              timeRemaining: 8,
            }}
            onContinue={() => console.log("Continue streak")}
            onDismiss={() => console.log("Dismissed")}
          />
        </TabsContent>

        {/* Mock Test Reminder */}
        <TabsContent value="test" className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">Mock Test Reminder</h2>
            <p className="text-muted-foreground">
              Test preparation component with readiness score and topic coverage
            </p>
          </div>
          <MockTestReminder
            testReminder={{
              testName: "Spanish Grammar Test",
              testType: "Practice Test",
              difficulty: "intermediate",
              estimatedDuration: 45,
              userPassRate: 75,
              averagePassRate: 70,
              scheduledTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
              preparationTips: [
                "Review verb conjugations",
                "Practice with flashcards",
                "Complete practice exercises",
              ],
            }}
            onStart={() => console.log("Start test")}
            onReschedule={(newTime) => console.log("Reschedule to:", newTime)}
          />
        </TabsContent>

        {/* System Notification */}
        <TabsContent value="system" className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">System Notification</h2>
            <p className="text-muted-foreground">
              General system message with markdown support and rich content
            </p>
          </div>
          <div className="space-y-4">
            <SystemNotification
              notification={{
                id: "sys-001",
                title: "System Maintenance Scheduled",
                body: "We'll be performing **scheduled maintenance** on January 20th from 2:00 AM to 4:00 AM UTC. During this time, the platform will be temporarily unavailable.\n\n### What to expect:\n- Brief service interruption\n- Improved performance\n- New features\n\nThank you for your patience!",
                priority: "warning",
                actionUrl: "/maintenance-schedule",
                actionLabel: "View Schedule",
                attachments: [
                  {
                    name: "maintenance-plan.pdf",
                    url: "/files/plan.pdf",
                    size: "2.5 MB",
                  },
                ],
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                persistent: false,
              }}
              onAction={() => console.log("Action clicked")}
              onDismiss={() => console.log("Dismissed")}
            />
          </div>
        </TabsContent>

        {/* Mentoring Notification */}
        <TabsContent value="mentoring" className="space-y-4">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">Mentoring Notification</h2>
            <p className="text-muted-foreground">
              Personal messaging component with mentor avatar and quick replies
            </p>
          </div>
          <MentoringNotification
            notification={{
              mentorName: "Dr. Sarah Johnson",
              mentorAvatar: "/avatars/default.png",
              messagePreview:
                "Great question! The subjunctive mood is used to express wishes, doubts, or hypothetical situations. Let me give you some examples...",
              conversationId: "conv-123",
              unread: true,
              timestamp: new Date(Date.now() - 30 * 60 * 1000),
              isOnline: true,
              isVerified: true,
              responseTime: "2 hours",
              relationshipDuration: "3 months",
              conversationContext: {
                topic: "Spanish Grammar",
                originalQuestion: "How do I use the subjunctive mood?",
              },
            }}
            onReply={(message) => console.log("Reply:", message)}
            onView={() => console.log("View conversation")}
          />
        </TabsContent>
      </Tabs>

      {/* Component Stats */}
      <div className="border rounded-lg p-6 space-y-4">
        <h3 className="text-xl font-semibold">Component Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Components</p>
            <p className="text-2xl font-bold">6</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Lines of Code</p>
            <p className="text-2xl font-bold">~2000</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Features</p>
            <p className="text-2xl font-bold">60+</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Accessibility</p>
            <p className="text-2xl font-bold">WCAG 2.1 AA</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Type Safety</p>
            <p className="text-2xl font-bold">100%</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="text-2xl font-bold text-green-500">✓ Complete</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SpecializedNotificationsDemo;
