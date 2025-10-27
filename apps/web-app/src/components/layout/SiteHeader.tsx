"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

export function SiteHeader() {
  const { data: session, status } = useSession();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const isSignedIn = status === "authenticated" && !!session?.user;
  const isLoading = status === "loading";

  // Don't render until client-side to avoid hydration mismatch
  if (!isClient) {
    return null;
  }

  return (
    <header id="site-header" className="bg-white">
      {/* Announcement Bar */}
      <AnnouncementBar isSignedIn={isSignedIn} />

      <div className="lg-container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <div className="flex items-center gap-2">
              {/* Exercism Logo - using the exact styling from image */}
              <div className="text-2xl font-bold text-textColor1">
                <span className="text-prominentLinkColor">{"{-}"}</span>{" "}
                exercism
              </div>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            <Link
              href="/tracks"
              className="text-textColor1 hover:text-prominentLinkColor font-medium text-[16px] transition-colors"
            >
              Learn
            </Link>
            <Link
              href="/community"
              className="text-textColor1 hover:text-prominentLinkColor font-medium text-[16px] transition-colors"
            >
              Discover
            </Link>
            <Link
              href="/contributing"
              className="text-textColor1 hover:text-prominentLinkColor font-medium text-[16px] transition-colors"
            >
              Contribute
            </Link>
            <Link
              href="/about"
              className="text-textColor1 hover:text-prominentLinkColor font-medium text-[16px] transition-colors"
            >
              More
            </Link>
          </nav>

          {/* Auth Buttons */}
          <div className="flex items-center gap-3">
            {isLoading ? (
              <div className="w-20 h-8 bg-borderColor animate-pulse rounded" />
            ) : isSignedIn ? (
              <SignedInSection user={session.user} />
            ) : (
              <SignedOutSection />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function AnnouncementBar({ isSignedIn }: { isSignedIn: boolean }) {
  if (isSignedIn) {
    // For signed-in users, show donation bar if they haven't donated recently
    // This would need to check user's donation status
    return null;
  }

  // For signed-out users, show coding fundamentals announcement
  return (
    <div className="bg-[#1e1b4b] text-white py-3 text-center text-sm">
      <div className="lg-container">
        <Link
          href="/bootcamp/coding-fundamentals"
          className="hover:underline inline-flex items-center"
        >
          <span className="mr-2">👋</span>
          <span>Learning to code? Check out our </span>
          <strong className="mx-1 underline">Coding Fundamentals</strong>
          <span> course for beginners!</span>
        </Link>
      </div>
    </div>
  );
}

function SignedInSection({
  user,
}: {
  user: { handle?: string; name?: string } | null;
}) {
  return (
    <div className="flex items-center gap-4">
      <Link
        href="/dashboard"
        className="text-textColor1 hover:text-prominentLinkColor font-medium"
      >
        Dashboard
      </Link>
      <div className="w-8 h-8 bg-prominentLinkColor rounded-full flex items-center justify-center">
        <span className="text-white font-bold text-sm">
          {user?.handle?.charAt(0).toUpperCase() || "U"}
        </span>
      </div>
    </div>
  );
}

function SignedOutSection() {
  return (
    <div className="flex items-center gap-3">
      <Link
        href="/auth/register"
        className="inline-flex items-center justify-center px-4 py-2 bg-prominentLinkColor text-white font-semibold text-sm rounded-md hover:bg-[#5856eb] transition-colors duration-200"
      >
        Sign up
      </Link>
      <Link
        href="/auth/signin"
        className="inline-flex items-center justify-center px-4 py-2 bg-white text-textColor1 font-semibold text-sm rounded-md border border-borderColor hover:bg-backgroundColorB transition-colors duration-200"
      >
        Log in
      </Link>
    </div>
  );
}
