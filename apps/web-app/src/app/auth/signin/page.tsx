import { Metadata } from "next";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Code splitting: Dynamically import SignInPage to reduce initial bundle size
const SignInPage = dynamic(
  () => import("@/components/auth/pages/SignInPage").then((mod) => ({ default: mod.SignInPage })),
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
  title: "Sign In | DriveMaster",
  description: "Sign in to your DriveMaster account to access your dashboard and continue your learning journey.",
};

export default function SignIn() {
  return <SignInPage />;
}
