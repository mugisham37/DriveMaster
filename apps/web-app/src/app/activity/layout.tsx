/**
 * Activity Page Layout with Real-Time Features
 * 
 * Example integration of real-time activity updates in a page layout.
 */

"use client";

import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeActivity } from "@/hooks/useRealtimeActivity";
import { RealtimeStatusBar } from "@/components/user/organisms/RealtimeStatusBar";

interface ActivityLayoutProps {
  children: ReactNode;
}

export default function ActivityLayout({ children }: ActivityLayoutProps) {
  const { user } = useAuth();
  
  // Initialize real-time activity updates
  useRealtimeActivity(user?.id?.toString());

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
