import { Metadata } from "next";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Code splitting: Dynamically import SignUpPage to reduce initial bundle size
const SignUpPage = dynamic(
  () => import("@/components/auth/pages/SignUpPage").then((mod) => ({ default: mod.SignUpPage })),
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
  title: "Sign Up | DriveMaster",
  description: "Create your DriveMaster account and start your learning journey today.",
};

export default function SignUp() {
  return <SignUpPage />;
}
