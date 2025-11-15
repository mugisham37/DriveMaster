/**
 * ProfileLayout Template
 * 
 * Implements the profile page layout with:
 * - ProfileHeader at top
 * - Tab navigation (Overview, Progress, Activity, GDPR)
 * - Tab state management in URL
 * - Responsive design
 * 
 * Requirements: 3.2
 * Task: 6.1
 */

'use client';

import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProfileHeader } from '@/components/user/organisms/ProfileHeader';
import { User, TrendingUp, Activity, Shield } from 'lucide-react';
import type { UserProfile } from '@/types/user-service';

// ============================================================================
// Types
// ============================================================================

export type ProfileTab = 'overview' | 'progress' | 'activity' | 'gdpr';

export interface ProfileLayoutProps {
  userId: string;
  userProfile?: UserProfile; // Optional, ProfileHeader will fetch it
  children?: React.ReactNode;
  defaultTab?: ProfileTab;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function ProfileLayout({
  userId,
  userProfile: _userProfile,
  children,
  defaultTab = 'overview',
  className = '',
}: ProfileLayoutProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = (searchParams.get('tab') as ProfileTab) || defaultTab;

  const handleTabChange = (value: string) => {
    const newTab = value as ProfileTab;
    router.push(`/profile?tab=${newTab}`, { scroll: false });
  };

  return (
    <div className={`container max-w-6xl mx-auto py-6 px-4 space-y-6 ${className}`}>
      {/* Profile Header */}
      <ProfileHeader userId={userId} />

      {/* Tab Navigation */}
      <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger 
            value="overview" 
            className="gap-2 py-2.5 text-sm"
            aria-label="Profile Overview"
          >
            <User className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Overview</span>
            <span className="sm:hidden">Info</span>
          </TabsTrigger>
          
          <TabsTrigger 
            value="progress" 
            className="gap-2 py-2.5 text-sm"
            aria-label="Progress Tracking"
          >
            <TrendingUp className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Progress</span>
            <span className="sm:hidden">Stats</span>
          </TabsTrigger>
          
          <TabsTrigger 
            value="activity" 
            className="gap-2 py-2.5 text-sm"
            aria-label="Activity History"
          >
            <Activity className="h-4 w-4" aria-hidden="true" />
            <span>Activity</span>
          </TabsTrigger>
          
          <TabsTrigger 
            value="gdpr" 
            className="gap-2 py-2.5 text-sm"
            aria-label="Privacy & GDPR"
          >
            <Shield className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Privacy</span>
            <span className="sm:hidden">GDPR</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab Content */}
        {children}
      </Tabs>
    </div>
  );
}
