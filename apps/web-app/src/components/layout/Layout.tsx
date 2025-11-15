"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SkipNavigation } from "./SkipNavigation";

interface LayoutProps {
  children: ReactNode;
}

/**
 * Layout component
 * Main layout wrapper for the application with header and footer
 * Enhanced with WCAG 2.1 AA accessibility features
 * 
 * Requirements: 10.1, 10.2, 10.3, 10.4
 * Task: 13.1, 13.2
 */
export function Layout({ children }: LayoutProps) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Skip Navigation Links */}
      <SkipNavigation />

      {/* Header */}
      <header 
        id="header" 
        role="banner" 
        className="sticky top-0 z-40 w-full border-b bg-white"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-2">
                <span className="text-2xl font-bold text-purple">
                  DriveMaster
                </span>
              </Link>
            </div>

            {/* Navigation */}
            <nav 
              id="main-navigation" 
              className="hidden md:flex items-center space-x-6"
              aria-label="Main navigation"
            >
              <Link
                href="/tracks"
                className={`text-sm font-medium transition-colors hover:text-purple focus:outline-none focus:ring-2 focus:ring-purple focus:ring-offset-2 rounded px-2 py-1 ${
                  isActive("/tracks")
                    ? "text-purple"
                    : "text-gray-600"
                }`}
                aria-current={isActive("/tracks") ? "page" : undefined}
              >
                Tracks
              </Link>
              <Link
                href="/exercises"
                className={`text-sm font-medium transition-colors hover:text-purple focus:outline-none focus:ring-2 focus:ring-purple focus:ring-offset-2 rounded px-2 py-1 ${
                  isActive("/exercises")
                    ? "text-purple"
                    : "text-gray-600"
                }`}
                aria-current={isActive("/exercises") ? "page" : undefined}
              >
                Exercises
              </Link>
              <Link
                href="/mentoring"
                className={`text-sm font-medium transition-colors hover:text-purple focus:outline-none focus:ring-2 focus:ring-purple focus:ring-offset-2 rounded px-2 py-1 ${
                  isActive("/mentoring")
                    ? "text-purple"
                    : "text-gray-600"
                }`}
                aria-current={isActive("/mentoring") ? "page" : undefined}
              >
                Mentoring
              </Link>
              <Link
                href="/community"
                className={`text-sm font-medium transition-colors hover:text-purple focus:outline-none focus:ring-2 focus:ring-purple focus:ring-offset-2 rounded px-2 py-1 ${
                  isActive("/community")
                    ? "text-purple"
                    : "text-gray-600"
                }`}
                aria-current={isActive("/community") ? "page" : undefined}
              >
                Community
              </Link>
              <Link
                href="/about"
                className={`text-sm font-medium transition-colors hover:text-purple focus:outline-none focus:ring-2 focus:ring-purple focus:ring-offset-2 rounded px-2 py-1 ${
                  isActive("/about")
                    ? "text-purple"
                    : "text-gray-600"
                }`}
                aria-current={isActive("/about") ? "page" : undefined}
              >
                About
              </Link>
            </nav>

            {/* Auth Buttons */}
            <div className="flex items-center space-x-4">
              <Link
                href="/login"
                className="text-sm font-medium text-gray-600 hover:text-purple transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="btn-primary btn-m"
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main 
        id="main-content" 
        role="main" 
        className="flex-1"
        tabIndex={-1}
      >
        {children}
      </main>

      {/* Footer */}
      <footer 
        id="footer" 
        role="contentinfo" 
        className="border-t bg-gray-50"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* About Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                About DriveMaster
              </h3>
              <p className="text-sm text-gray-600">
                Master your driving skills with comprehensive lessons and
                practice tests.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                Quick Links
              </h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/tracks"
                    className="text-sm text-gray-600 hover:text-purple transition-colors"
                  >
                    Tracks
                  </Link>
                </li>
                <li>
                  <Link
                    href="/exercises"
                    className="text-sm text-gray-600 hover:text-purple transition-colors"
                  >
                    Exercises
                  </Link>
                </li>
                <li>
                  <Link
                    href="/mentoring"
                    className="text-sm text-gray-600 hover:text-purple transition-colors"
                  >
                    Mentoring
                  </Link>
                </li>
              </ul>
            </div>

            {/* Community */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                Community
              </h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/community"
                    className="text-sm text-gray-600 hover:text-purple transition-colors"
                  >
                    Forum
                  </Link>
                </li>
                <li>
                  <Link
                    href="/blog"
                    className="text-sm text-gray-600 hover:text-purple transition-colors"
                  >
                    Blog
                  </Link>
                </li>
                <li>
                  <Link
                    href="/events"
                    className="text-sm text-gray-600 hover:text-purple transition-colors"
                  >
                    Events
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                Legal
              </h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/privacy"
                    className="text-sm text-gray-600 hover:text-purple transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="text-sm text-gray-600 hover:text-purple transition-colors"
                  >
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link
                    href="/contact"
                    className="text-sm text-gray-600 hover:text-purple transition-colors"
                  >
                    Contact Us
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t">
            <p className="text-sm text-gray-600 text-center">
              © {new Date().getFullYear()} DriveMaster. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
