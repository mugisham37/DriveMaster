import { Metadata } from "next";
import { PerformanceDashboard } from "@/components/auth/shared/PerformanceDashboard";

export const metadata: Metadata = {
  title: "Performance Dashboard | DriveMaster",
  description: "Monitor authentication performance metrics and optimizations",
};

export default function PerformanceTestPage() {
  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      <PerformanceDashboard />
    </div>
  );
}
