import { Metadata } from "next";
import { OAuthCallbackPage } from "@/components/auth/pages/OAuthCallbackPage";

export const metadata: Metadata = {
  title: "Authenticating... | DriveMaster",
  description: "Completing your authentication with OAuth provider.",
};

export default function OAuthCallback() {
  return <OAuthCallbackPage />;
}
