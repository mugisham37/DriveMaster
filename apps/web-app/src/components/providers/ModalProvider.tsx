"use client";

import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { 
  BegModal,
  SenioritySurveyModal,
  WelcomeModal,
  WelcomeToInsidersModal,
  TrackWelcomeModal
} from "@/components/modals";
import { JSX } from "react/jsx-runtime";

interface ModalProviderProps {
  children: React.ReactNode;
  trackData?: {
    slug: string;
    title: string;
    iconUrl: string;
  };
  numTracks?: number;
}

export function ModalProvider({
  children,
  trackData,
  numTracks = 67,
}: ModalProviderProps): JSX.Element {
  const { user, isAuthenticated } = useAuth();

  // Calculate user joined days ago
  const userJoinedDaysAgo = user?.createdAt
    ? Math.floor(
        (Date.now() - new Date(user.createdAt).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : 0;

  return (
    <>
      {children}

      {/* Render all modals - they will manage their own visibility */}
      {isAuthenticated && (
        <>
          <WelcomeModal numTracks={numTracks} />
          <SenioritySurveyModal />
          <BegModal />
          <WelcomeToInsidersModal />

          {/* Track-specific modal */}
          {trackData && (
            <TrackWelcomeModal
              track={trackData}
              userSeniority={user?.seniority || "beginner"}
              userJoinedDaysAgo={userJoinedDaysAgo}
            />
          )}
        </>
      )}
    </>
  );
}

export default ModalProvider;
