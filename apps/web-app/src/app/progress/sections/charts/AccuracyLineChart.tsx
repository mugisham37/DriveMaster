/**
 * Accuracy Line Chart
 * 
 * Line chart visualization for accuracy trends over time using recharts.
 */

'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

interface AccuracyDataPoint {
  date: string;
  accuracy: number;
  questions: number;
  correct: number;
}

interface AccuracyLineChartProps {
  data: AccuracyDataPoint[];
}

export default function AccuracyLineChart({ data }: AccuracyLineChartProps) {
  // Calculate average for reference line
  const average = data.length > 0
    ? Math.round(data.reduce((sum, point) => sum + point.accuracy, 0) / data.length)
    : 0;

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12 }}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis
          label={{ value: 'Accuracy (%)', angle: -90, position: 'insideLeft' }}
          domain={[0, 100]}
          tick={{ fontSize: 12 }}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload as AccuracyDataPoint;
              return (
                <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                  <p className="font-semibold">{data.date}</p>
                  <p className="text-sm text-gray-600">
                    Accuracy: {data.accuracy}%
                  </p>
                  <p className="text-sm text-gray-600">
                    Questions: {data.questions}
                  </p>
                  <p className="text-sm text-gray-600">
                    Correct: {data.correct}
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <ReferenceLine
          y={average}
          stroke="#9ca3af"
          strokeDasharray="3 3"
          label={{
            value: `Avg: ${average}%`,
            position: 'right',
            fill: '#6b7280',
            fontSize: 12,
          }}
        />
        <Line
          type="monotone"
          dataKey="accuracy"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ fill: '#3b82f6', r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
