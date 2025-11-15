/**
 * Progress Page Layout with Real-Time Features
 * 
 * Example integration of real-time progress updates in a page layout.
 */

"use client";

import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeProgress } from "@/hooks/useRealtimeProgress";
import { RealtimeStatusBar } from "@/components/user/organisms/RealtimeStatusBar";

interface ProgressLayoutProps {
  children: ReactNode;
}

export default function ProgressLayout({ children }: ProgressLayoutProps) {
  const { user } = useAuth();
  
  // Initialize real-time progress updates
  useRealtimeProgress(user?.id?.toString());

  return (
    <div className="flex min-h-screen flex-col">
      {/* Real-time status bar */}
      <RealtimeStatusBar userId={user?.id?.toString()} />
      
      {/* Main content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
