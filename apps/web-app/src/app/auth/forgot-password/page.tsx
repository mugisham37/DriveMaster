import { Metadata } from "next";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Code splitting: Dynamically import ForgotPasswordPage to reduce initial bundle size
const ForgotPasswordPage = dynamic(
  () => import("@/components/auth/pages/ForgotPasswordPage").then((mod) => ({ default: mod.ForgotPasswordPage })),
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
  title: "Forgot Password | DriveMaster",
  description: "Reset your DriveMaster account password. We'll send you instructions to create a new password.",
};

export default function ForgotPassword() {
  return <ForgotPasswordPage />;
}
