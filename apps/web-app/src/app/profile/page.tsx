'use client';

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Code splitting: Dynamically import ProfilePage to reduce initial bundle size
const ProfilePage = dynamic(
  () => import("@/components/auth/profile").then((mod) => ({ default: mod.ProfilePage })),
  {
    loading: () => (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
    ssr: false, // Disable SSR for protected pages (requires auth check)
  }
);

export default function Profile() {
  return <ProfilePage />;
}
