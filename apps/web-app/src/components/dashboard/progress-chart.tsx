"use client";

import { ProgressTimeline } from "@/types/analytics";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Legend,
} from "recharts";
import { format, parseISO } from "date-fns";

interface ProgressChartProps {
  data: ProgressTimeline[];
  timeframe: "week" | "month" | "quarter" | "year";
}

export function ProgressChart({ data, timeframe }: ProgressChartProps) {
  const formatXAxisDate = (dateString: string) => {
    const date = parseISO(dateString);
    switch (timeframe) {
      case "week":
        return format(date, "EEE");
      case "month":
        return format(date, "MMM d");
      case "quarter":
      case "year":
        return format(date, "MMM");
      default:
        return format(date, "MMM d");
    }
  };

  const formatTooltipDate = (dateString: string) => {
    const date = parseISO(dateString);
    return format(date, "MMM d, yyyy");
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 mb-2">
            {formatTooltipDate(label)}
          </p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-gray-600">{entry.name}:</span>
              <span className="font-medium text-gray-900">
                {entry.name === "Accuracy"
                  ? `${entry.value.toFixed(1)}%`
                  : entry.name === "Study Time"
                  ? `${entry.value} min`
                  : entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Accuracy and Questions Chart */}
      <div className="h-64">
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          Accuracy & Questions Over Time
        </h4>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tickFormatter={formatXAxisDate}
              stroke="#6b7280"
              fontSize={12}
            />
            <YAxis
              yAxisId="left"
              stroke="#6b7280"
              fontSize={12}
              domain={[0, 100]}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#6b7280"
              fontSize={12}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="accuracy"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
              name="Accuracy"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="questionsAnswered"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
              name="Questions"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Study Time and Streak Chart */}
      <div className="h-64">
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          Study Time & Streak
        </h4>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tickFormatter={formatXAxisDate}
              stroke="#6b7280"
              fontSize={12}
            />
            <YAxis yAxisId="left" stroke="#6b7280" fontSize={12} />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#6b7280"
              fontSize={12}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="timeStudied"
              stroke="#f59e0b"
              fill="#fef3c7"
              strokeWidth={2}
              name="Study Time"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="streak"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ fill: "#ef4444", strokeWidth: 2, r: 4 }}
              name="Streak"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Topics Mastered Progress */}
      <div className="h-48">
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          Topics Mastered
        </h4>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tickFormatter={formatXAxisDate}
              stroke="#6b7280"
              fontSize={12}
            />
            <YAxis stroke="#6b7280" fontSize={12} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="topicsMastered"
              stroke="#8b5cf6"
              fill="#ede9fe"
              strokeWidth={2}
              name="Topics Mastered"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
