/**
 * Topic Mastery Radar Chart
 * 
 * Radar chart visualization for topic mastery levels using recharts.
 */

'use client';

import React from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface TopicMasteryData {
  name: string;
  mastery: number;
  practiceCount: number;
}

interface TopicMasteryRadarChartProps {
  data: TopicMasteryData[];
  onTopicClick?: (topic: string) => void;
  selectedTopic?: string | null;
}

export default function TopicMasteryRadarChart({
  data,
  onTopicClick,
  selectedTopic,
}: TopicMasteryRadarChartProps) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <RadarChart data={data}>
        <PolarGrid stroke="#e5e7eb" />
        <PolarAngleAxis
          dataKey="name"
          tick={{ fontSize: 12 }}
          onClick={(data) => {
            if (data && data.value) {
              onTopicClick?.(data.value as string);
            }
          }}
          style={{ cursor: 'pointer' }}
        />
        <PolarRadiusAxis angle={90} domain={[0, 100]} />
        <Radar
          name="Mastery"
          dataKey="mastery"
          stroke="#3b82f6"
          fill="#3b82f6"
          fillOpacity={0.6}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload as TopicMasteryData;
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
      </RadarChart>
    </ResponsiveContainer>
  );
}
