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
      {/* Top Banner */}
      <TopBanner isSignedIn={isSignedIn} />

      {/* Navigation Bar */}
      <div className="h-[70px] px-[60px]">
        <div className="flex items-center justify-between h-full">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <div className="text-[20px] font-bold text-[#1E1B4B]">
              <span className="text-[#7C3AED]">{"{∧}"}</span>{" "}
              exercism
            </div>
          </Link>

          {/* Navigation Items */}
          <nav className="hidden lg:flex items-center ml-[80px] space-x-[40px]">
            <Link
              href="/tracks"
              className="text-[#4B5563] hover:text-[#7C3AED] font-medium text-[16px] transition-colors"
            >
              Learn
            </Link>
            <Link
              href="/community"
              className="text-[#4B5563] hover:text-[#7C3AED] font-medium text-[16px] transition-colors"
            >
              Discover
            </Link>
            <Link
              href="/contributing"
              className="text-[#4B5563] hover:text-[#7C3AED] font-medium text-[16px] transition-colors"
            >
              Contribute
            </Link>
            <Link
              href="/about"
              className="text-[#4B5563] hover:text-[#7C3AED] font-medium text-[16px] transition-colors"
            >
              More
            </Link>
          </nav>

          {/* Auth Buttons */}
          <div className="flex items-center gap-[12px]">
            {isLoading ? (
              <div className="w-20 h-8 bg-gray-200 animate-pulse rounded" />
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

function TopBanner({ isSignedIn }: { isSignedIn: boolean }) {
  if (isSignedIn) {
    return null;
  }

  return (
    <div className="bg-[#1E1B4B] h-[40px] flex items-center justify-center px-[60px]">
      <div className="text-center text-[14px] text-white font-normal">
        <span className="mr-2">👋</span>
        <span>Learning to code? Check out our </span>
        <Link
          href="/bootcamp/coding-fundamentals"
          className="text-[#FF9B5E] underline font-semibold hover:opacity-80"
        >
          Coding Fundamentals
        </Link>
        <span> course for beginners!</span>
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
        className="text-[#4B5563] hover:text-[#7C3AED] font-medium"
      >
        Dashboard
      </Link>
      <div className="w-8 h-8 bg-[#7C3AED] rounded-full flex items-center justify-center">
        <span className="text-white font-bold text-sm">
          {user?.handle?.charAt(0).toUpperCase() || "U"}
        </span>
      </div>
    </div>
  );
}

function SignedOutSection() {
  return (
    <div className="flex items-center gap-[12px]">
      <Link
        href="/auth/register"
        className="inline-flex items-center justify-center px-[24px] py-[12px] bg-[#7C3AED] text-white font-semibold text-[16px] rounded-[6px] hover:bg-[#6D28D9] transition-colors duration-200"
      >
        Sign up
      </Link>
      <Link
        href="/auth/signin"
        className="inline-flex items-center justify-center px-[24px] py-[12px] bg-white text-[#7C3AED] font-semibold text-[16px] rounded-[6px] border-2 border-[#7C3AED] hover:bg-[#F8F9FF] transition-colors duration-200"
      >
        Log in
      </Link>
    </div>
  );
}
