"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useNavigationDropdown } from "@/hooks/useNavigationDropdown";
import { UserMenu } from "./UserMenu";
import {
  LearnDropdown,
  DiscoverDropdown,
  ContributeDropdown,
  MoreDropdown,
} from "./navigation";

export function SiteHeader() {
  const { isAuthenticated, isLoading, isInitialized, user } = useAuth();
  const [isClient, setIsClient] = useState(false);

  // Navigation dropdown hooks
  const learnDropdown = useNavigationDropdown();
  const discoverDropdown = useNavigationDropdown();
  const contributeDropdown = useNavigationDropdown();
  const moreDropdown = useNavigationDropdown();

  useEffect(() => {
    setIsClient(true);
  }, []);

  const isSignedIn = isAuthenticated && !!user;
  const showLoading = isLoading || !isClient || !isInitialized;

  return (
    <header
      id="site-header"
      className="bg-white"
      suppressHydrationWarning={true}
    >
      {/* Top Banner */}
      <TopBanner isSignedIn={isSignedIn} />

      {/* Navigation Bar */}
      <div className="h-[70px] px-[60px]">
        <div className="flex items-center justify-between h-full">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <div className="text-[20px] font-bold text-[#1E1B4B]">
              <span className="text-[#7C3AED]">{"{∧}"}</span> exercism
            </div>
          </Link>

          {/* Navigation Items */}
          <nav className="hidden lg:flex items-center ml-[80px] space-x-[40px]">
            <div
              className="navigation-item-wrapper"
              ref={learnDropdown.dropdownRef}
              onMouseEnter={learnDropdown.handleMouseEnter}
              onMouseLeave={learnDropdown.handleMouseLeave}
            >
              <Link
                href="/tracks"
                className="text-[#4B5563] hover:text-[#7C3AED] font-medium text-[16px] transition-colors navigation-link"
              >
                Learn
              </Link>
              <LearnDropdown
                isOpen={learnDropdown.isOpen}
                onClose={learnDropdown.close}
              />
            </div>

            <div
              className="navigation-item-wrapper"
              ref={discoverDropdown.dropdownRef}
              onMouseEnter={discoverDropdown.handleMouseEnter}
              onMouseLeave={discoverDropdown.handleMouseLeave}
            >
              <Link
                href="/community"
                className="text-[#4B5563] hover:text-[#7C3AED] font-medium text-[16px] transition-colors navigation-link"
              >
                Discover
              </Link>
              <DiscoverDropdown
                isOpen={discoverDropdown.isOpen}
                onClose={discoverDropdown.close}
              />
            </div>

            <div
              className="navigation-item-wrapper"
              ref={contributeDropdown.dropdownRef}
              onMouseEnter={contributeDropdown.handleMouseEnter}
              onMouseLeave={contributeDropdown.handleMouseLeave}
            >
              <Link
                href="/contributing"
                className="text-[#4B5563] hover:text-[#7C3AED] font-medium text-[16px] transition-colors navigation-link"
              >
                Contribute
              </Link>
              <ContributeDropdown
                isOpen={contributeDropdown.isOpen}
                onClose={contributeDropdown.close}
              />
            </div>

            <div
              className="navigation-item-wrapper"
              ref={moreDropdown.dropdownRef}
              onMouseEnter={moreDropdown.handleMouseEnter}
              onMouseLeave={moreDropdown.handleMouseLeave}
            >
              <Link
                href="/about"
                className="text-[#4B5563] hover:text-[#7C3AED] font-medium text-[16px] transition-colors navigation-link"
              >
                More
              </Link>
              <MoreDropdown
                isOpen={moreDropdown.isOpen}
                onClose={moreDropdown.close}
              />
            </div>
          </nav>

          {/* Auth Buttons */}
          <div className="flex items-center gap-[12px]">
            {showLoading ? (
              <div className="w-20 h-8 bg-gray-200 animate-pulse rounded" />
            ) : isSignedIn ? (
              <SignedInSection user={user} />
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
  // Always render the banner container to avoid hydration mismatch
  // Hide content with CSS if signed in
  return (
    <div
      className={`bg-[#1E1B4B] h-[40px] flex items-center justify-center px-[60px] ${
        isSignedIn ? "hidden" : ""
      }`}
    >
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
      <UserMenu />
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
