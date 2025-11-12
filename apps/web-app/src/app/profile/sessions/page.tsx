import { Metadata } from "next";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/guards/ProtectedRoute";

// Code splitting: Dynamically import SessionManagementPage to reduce initial bundle size
const SessionManagementPage = dynamic(
  () => import("@/components/auth/sessions/SessionManagementPage").then((mod) => ({ default: mod.SessionManagementPage })),
  {
    loading: () => (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
    ssr: false, // Disable SSR for protected pages (requires auth check)
  }
);

export const metadata: Metadata = {
  title: "Active Sessions | DriveMaster",
  description: "View and manage your active sessions across all devices. Revoke access from devices you no longer use.",
};

export default function Sessions() {
  return (
    <ProtectedRoute>
      <SessionManagementPage />
    </ProtectedRoute>
  );
}
