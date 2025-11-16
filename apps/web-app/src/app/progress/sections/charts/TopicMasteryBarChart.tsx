/**
 * Topic Mastery Bar Chart
 * 
 * Bar chart visualization for topic mastery levels using recharts.
 */

'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface TopicMasteryData {
  name: string;
  mastery: number;
  practiceCount: number;
}

interface TopicMasteryBarChartProps {
  data: TopicMasteryData[];
  onTopicClick?: (topic: string) => void;
  selectedTopic?: string | null;
}

export default function TopicMasteryBarChart({
  data,
  onTopicClick,
  selectedTopic,
}: TopicMasteryBarChartProps) {
  const getBarColor = (mastery: number, isSelected: boolean) => {
    if (isSelected) {
      return '#3b82f6'; // blue-500
    }
    if (mastery >= 80) {
      return '#22c55e'; // green-500
    } else if (mastery >= 50) {
      return '#eab308'; // yellow-500
    } else {
      return '#ef4444'; // red-500
    }
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="name"
          angle={-45}
          textAnchor="end"
          height={100}
          tick={{ fontSize: 12 }}
        />
        <YAxis
          label={{ value: 'Mastery (%)', angle: -90, position: 'insideLeft' }}
          domain={[0, 100]}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0]?.payload as TopicMasteryData;
              return (
                <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                  <p className="font-semibold">{data.name}</p>
                  <p className="text-sm text-gray-600">
                    Mastery: {data.mastery}%
                  </p>
                  <p className="text-sm text-gray-600">
                    Practice Count: {data.practiceCount}
                  </p>
                </div>
              );
            }
            return null;
          }}
        />
        <Bar
          dataKey="mastery"
          radius={[8, 8, 0, 0]}
          onClick={(data) => onTopicClick?.(data.name)}
          cursor="pointer"
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={getBarColor(entry.mastery, selectedTopic === entry.name)}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
