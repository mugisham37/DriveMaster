"use client";

import { useEffect } from "react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global application error:", error);
  }, [error]);

  return (
    <html>
      <body>
        <div
          id="page-error"
          className="pt-40 min-h-screen flex items-center justify-center"
        >
          <div className="text-center">
            <div className="text-purple leading-110 text-[128px]">500</div>
            <h1 className="text-h1 mb-16">Application Error</h1>
            <p className="text-textColor6 text-24 leading-150 font-semibold mb-24">
              A critical error occurred in the application.
            </p>
            <p className="text-p-xlarge max-w-[550px] mb-8 mx-auto">
              We apologize for the inconvenience. Please try refreshing the
              page.
            </p>
            <button onClick={reset} className="btn-primary btn-l">
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
