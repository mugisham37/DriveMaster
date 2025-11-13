'use client';

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { ProtectedRoute } from "@/components/auth/guards/ProtectedRoute";

// Code splitting: Dynamically import PasswordChangePage to reduce initial bundle size
const PasswordChangePage = dynamic(
  () => import("@/components/auth/sessions/PasswordChangePage").then((mod) => ({ default: mod.PasswordChangePage })),
  {
    loading: () => (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
    ssr: false, // Disable SSR for protected pages (requires auth check)
  }
);

export default function Security() {
  return (
    <ProtectedRoute>
      <PasswordChangePage />
    </ProtectedRoute>
  );
}
