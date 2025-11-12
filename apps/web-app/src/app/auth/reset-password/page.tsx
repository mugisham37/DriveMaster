import { Metadata } from "next";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Code splitting: Dynamically import ResetPasswordPage to reduce initial bundle size
const ResetPasswordPage = dynamic(
  () => import("@/components/auth/pages/ResetPasswordPage").then((mod) => ({ default: mod.ResetPasswordPage })),
  {
    loading: () => (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
    ssr: true, // Enable SSR for SEO
  }
);

export const metadata: Metadata = {
  title: "Reset Password | DriveMaster",
  description: "Create a new password for your DriveMaster account.",
};

export default function ResetPassword() {
  return <ResetPasswordPage />;
}
