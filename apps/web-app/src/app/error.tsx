"use client";

import { useEffect } from "react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application error:", error);
  }, [error]);

  return (
    <div id="page-error" className="pt-40">
      <div className="sm-container">
        <div className="flex items-center">
          <div className="mr-40">
            <div className="text-purple leading-110 text-[128px]">500</div>
            <h1 className="text-h1 mb-16">Something went wrong</h1>
            <p className="text-textColor6 text-24 leading-150 font-semibold mb-24">
              An unexpected error occurred while processing your request.
            </p>
            <p className="text-p-xlarge max-w-[550px] mb-8">
              We&apos;ve been notified about this issue and are working to fix
              it. Please try refreshing the page or go back to the homepage.
            </p>
            <div className="flex gap-4">
              <button onClick={reset} className="btn-primary btn-l">
                Try again
              </button>
              <Link href="/" className="btn-secondary btn-l">
                Go to homepage
              </Link>
            </div>
          </div>
          <div className="ml-auto">
            <svg
              className="w-[250px] h-[250px]"
              viewBox="0 0 400 300"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="200" cy="150" r="100" fill="#FEE2E2" />
              <path
                d="M160 120 L240 120 M160 180 L240 180"
                stroke="#DC2626"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <circle cx="180" cy="140" r="8" fill="#DC2626" />
              <circle cx="220" cy="140" r="8" fill="#DC2626" />
              <path
                d="M170 170 Q200 190 230 170"
                stroke="#DC2626"
                strokeWidth="3"
                fill="none"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
