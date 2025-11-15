/**
 * ActivityBreakdownChart Component
 * 
 * Displays a pie/donut chart showing the breakdown of activities by type
 * with percentage and count information.
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { ActivitySummary } from '@/types/user-service';
import { Skeleton } from '@/components/ui/skeleton';

interface ActivityBreakdownChartProps {
  summary?: ActivitySummary | undefined;
  isLoading?: boolean;
  className?: string;
}

const ACTIVITY_COLORS: Record<string, string> = {
  practice: '#3b82f6', // blue
  assessment: '#8b5cf6', // purple
  review: '#10b981', // green
  reading: '#f59e0b', // amber
  video: '#ef4444', // red
  quiz: '#06b6d4', // cyan
  default: '#6b7280', // gray
};

export function ActivityBreakdownChart({
  summary,
  isLoading,
  className = '',
}: ActivityBreakdownChartProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!summary || !summary.activityBreakdown) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Activity Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          No activity data available for this period
        </CardContent>
      </Card>
    );
  }

  // Transform Record to array for the chart
  const chartData = Object.entries(summary.activityBreakdown)
    .filter(([_type, count]) => count > 0)
    .map(([type, count]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: count,
      percentage: 0, // Will calculate below
    }));

  if (chartData.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Activity Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          No activity data available for this period
        </CardContent>
      </Card>
    );
  }

  const totalActivities = chartData.reduce((sum, item) => sum + item.value, 0);
  
  // Calculate percentages
  chartData.forEach((item) => {
    item.percentage = (item.value / totalActivities) * 100;
  });

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { name: string; value: number; percentage: number } }> }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            {data.value} activities ({data.percentage.toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Activity Breakdown</CardTitle>
        <p className="text-sm text-muted-foreground">
          Total: {totalActivities} activities
        </p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              fill="#8884d8"
              paddingAngle={2}
              dataKey="value"
              label={({ name, percentage }) => `${name} ${percentage.toFixed(0)}%`}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    ACTIVITY_COLORS[entry.name.toLowerCase()] ||
                    ACTIVITY_COLORS.default
                  }
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value: string, entry: { payload: { value: number } }) => (
                <span className="text-sm">
                  {value} ({entry.payload.value})
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Legend with counts */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          {chartData.map((item, index) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor:
                    ACTIVITY_COLORS[item.name.toLowerCase()] ||
                    ACTIVITY_COLORS.default,
                }}
              />
              <span className="text-muted-foreground">
                {item.name}: <span className="font-medium text-foreground">{item.value}</span>
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
