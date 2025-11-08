"use client";

import React, { useEffect, useState } from "react";

export interface ChartMilestone {
  month: string;
  label: string;
}

export interface ImpactChartProps {
  usersPerMonth: string; // JSON string of month -> user count mapping
  milestones: string; // JSON string array of milestones
}

/**
 * ImpactChart Component
 * Displays a chart showing growth over time with milestones
 */
export function ImpactChart({ usersPerMonth, milestones }: ImpactChartProps) {
  const [chartData, setChartData] = useState<Record<string, number>>({});
  const [chartMilestones, setChartMilestones] = useState<ChartMilestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const parsedData = JSON.parse(usersPerMonth);
      const parsedMilestones = JSON.parse(milestones);
      
      setChartData(parsedData);
      setChartMilestones(parsedMilestones);
      setIsLoading(false);
    } catch (error) {
      console.error("Error parsing chart data:", error);
      setChartData({});
      setChartMilestones([]);
      setIsLoading(false);
    }
  }, [usersPerMonth, milestones]);

  if (isLoading) {
    return <div className="impact-chart-loading">Loading chart...</div>;
  }

  const months = Object.keys(chartData);
  const maxUsers = Math.max(...Object.values(chartData));

  return (
    <div className="impact-chart">
      <div className="impact-chart-container">
        <div className="chart-area">
          {months.map((month, index) => {
            const users = chartData[month] || 0;
            const height = maxUsers > 0 ? (users / maxUsers) * 100 : 0;
            
            return (
              <div key={index} className="chart-bar-wrapper">
                <div
                  className="chart-bar"
                  style={{ height: `${height}%` }}
                  title={`${month}: ${users} users`}
                >
                  <span className="chart-bar-value">{users}</span>
                </div>
                <div className="chart-bar-label">{month}</div>
              </div>
            );
          })}
        </div>
      </div>
      {chartMilestones.length > 0 && (
        <div className="impact-chart-milestones">
          <h3>Milestones</h3>
          <ul>
            {chartMilestones.map((milestone, index) => (
              <li key={index}>
                <strong>{milestone.month}:</strong> {milestone.label}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
