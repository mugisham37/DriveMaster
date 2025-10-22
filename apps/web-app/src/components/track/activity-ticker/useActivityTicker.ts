// import { MetricsChannel } from '@/channels/metricsChannel'
import { Metric } from "@/components/types";
import { useState, useEffect } from "react";
import { METRIC_TYPES, allowedMetricTypes } from "./ActivityTicker.types";

// Mock MetricsChannel for now - replace with actual implementation
class MetricsChannel {
  constructor(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _callback: (metric: Metric) => void
  ) {
    // Mock implementation - callback would be used in real implementation
  }
  disconnect() {}
}

export function useActivityTicker({
  initialData,
  trackTitle,
}: {
  initialData: Metric;
  trackTitle: string;
}): {
  metric: Metric;
  animation: "animate-fadeIn" | "animate-fadeOut";
} {
  const [metric, setMetric] = useState<Metric>(initialData);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const connection = new MetricsChannel((metric: Metric) => {
      if (
        METRIC_TYPES.indexOf(metric.type as allowedMetricTypes) === -1 ||
        (trackTitle && trackTitle !== metric.track?.title)
      )
        return;

      setIsVisible(false);
      setTimeout(() => {
        setMetric(metric);
        setIsVisible(true);
      }, 300);
    });
    return () => connection.disconnect();
  }, [trackTitle]);

  return {
    metric,
    animation: isVisible ? "animate-fadeIn" : "animate-fadeOut",
  };
}
