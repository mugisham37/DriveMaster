/**
 * Password Strength Indicator Component
 * Provides visual feedback on password strength with requirements checklist
 */

"use client";

import React from "react";

interface PasswordStrengthIndicatorProps {
  password: string;
  showRequirements?: boolean;
  className?: string;
}

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
  met: boolean;
}

interface PasswordStrength {
  score: number; // 0-4
  label: string;
  color: string;
  percentage: number;
}

/**
 * Calculate password strength based on various criteria
 */
function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { score: 0, label: "No password", color: "bg-gray-300", percentage: 0 };
  }

  let score = 0;
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  // Length check (most important)
  if (checks.length) score++;
  if (password.length >= 12) score++;

  // Character variety
  if (checks.uppercase) score++;
  if (checks.lowercase) score++;
  if (checks.number) score++;
  if (checks.special) score++;

  // Normalize score to 0-4 range
  const normalizedScore = Math.min(Math.max(Math.floor(score / 1.5), 0), 4);

  const strengthMap: { label: string; color: string; percentage: number }[] = [
    { label: "Very Weak", color: "bg-red-500", percentage: 20 },
    { label: "Weak", color: "bg-orange-500", percentage: 40 },
    { label: "Fair", color: "bg-yellow-500", percentage: 60 },
    { label: "Good", color: "bg-lime-500", percentage: 80 },
    { label: "Strong", color: "bg-green-500", percentage: 100 },
  ];

  const strength = strengthMap[normalizedScore]!; // Safe because normalizedScore is 0-4

  return {
    score: normalizedScore,
    label: strength.label,
    color: strength.color,
    percentage: strength.percentage,
  };
}

/**
 * Get password requirements with their status
 */
function getPasswordRequirements(password: string): PasswordRequirement[] {
  return [
    {
      label: "At least 8 characters",
      test: (pwd) => pwd.length >= 8,
      met: password.length >= 8,
    },
    {
      label: "Contains uppercase letter (A-Z)",
      test: (pwd) => /[A-Z]/.test(pwd),
      met: /[A-Z]/.test(password),
    },
    {
      label: "Contains lowercase letter (a-z)",
      test: (pwd) => /[a-z]/.test(pwd),
      met: /[a-z]/.test(password),
    },
    {
      label: "Contains number (0-9)",
      test: (pwd) => /[0-9]/.test(pwd),
      met: /[0-9]/.test(password),
    },
    {
      label: "Contains special character (!@#$%^&*)",
      test: (pwd) => /[^A-Za-z0-9]/.test(pwd),
      met: /[^A-Za-z0-9]/.test(password),
    },
  ];
}

/**
 * Password Strength Indicator Component
 */
export function PasswordStrengthIndicator({
  password,
  showRequirements = false,
  className = "",
}: PasswordStrengthIndicatorProps): React.ReactElement {
  const strength = calculatePasswordStrength(password);
  const requirements = getPasswordRequirements(password);

  return (
    <div className={`space-y-2 ${className}`} role="status" aria-live="polite">
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Password strength:</span>
          <span
            className={`font-medium ${
              strength.score === 0
                ? "text-red-600"
                : strength.score === 1
                  ? "text-orange-600"
                  : strength.score === 2
                    ? "text-yellow-600"
                    : strength.score === 3
                      ? "text-lime-600"
                      : "text-green-600"
            }`}
            aria-label={`Password strength: ${strength.label}`}
          >
            {strength.label}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className={`h-full transition-all duration-300 ${strength.color}`}
            style={{ width: `${strength.percentage}%` }}
            role="progressbar"
            aria-valuenow={strength.percentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Password strength meter"
          />
        </div>
      </div>

      {/* Requirements Checklist */}
      {showRequirements && password && (
        <div className="space-y-1.5 pt-2">
          <p className="text-xs font-medium text-gray-700">Requirements:</p>
          <ul className="space-y-1" role="list">
            {requirements.map((req, index) => (
              <li
                key={index}
                className="flex items-center space-x-2 text-xs"
                role="listitem"
              >
                {req.met ? (
                  <svg
                    className="h-4 w-4 flex-shrink-0 text-green-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-4 w-4 flex-shrink-0 text-gray-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                )}
                <span
                  className={req.met ? "text-green-700" : "text-gray-500"}
                  aria-label={`${req.label}: ${req.met ? "met" : "not met"}`}
                >
                  {req.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Hook for password strength validation
 */
export function usePasswordStrength(password: string) {
  const strength = React.useMemo(
    () => calculatePasswordStrength(password),
    [password]
  );

  const requirements = React.useMemo(
    () => getPasswordRequirements(password),
    [password]
  );

  const isValid = React.useMemo(
    () => requirements.slice(0, 4).every((req) => req.met), // First 4 are required
    [requirements]
  );

  const isStrong = React.useMemo(() => strength.score >= 3, [strength.score]);

  return {
    strength,
    requirements,
    isValid,
    isStrong,
  };
}
