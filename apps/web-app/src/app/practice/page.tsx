"use client";

import { useSearchParams } from "next/navigation";
import { PracticeSession } from "@/components/practice/practice-session";

export default function PracticePage() {
  const searchParams = useSearchParams();
  const sessionType =
    (searchParams.get("type") as "practice" | "review" | "mock_test") ||
    "practice";
  const sessionId = searchParams.get("sessionId") || undefined;

  return <PracticeSession sessionType={sessionType} sessionId={sessionId} />;
}
