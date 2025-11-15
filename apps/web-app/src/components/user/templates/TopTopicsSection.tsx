/**
 * TopTopicsSection Component
 * 
 * Displays top topics by time spent with activity count and last activity timestamp.
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Activity as ActivityIcon, Calendar } from 'lucide-react';
import { ActivitySummary } from '@/types/user-service';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

interface TopTopicsSectionProps {
  summary?: ActivitySummary | undefined;
  isLoading?: boolean;
  className?: string;
}

export function TopTopicsSection({
  summary,
  isLoading,
  className = '',
}: TopTopicsSectionProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary || !summary.topTopics || summary.topTopics.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Top Topics</CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          No topic data available
        </CardContent>
      </Card>
    );
  }

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Top Topics</CardTitle>
        <p className="text-sm text-muted-foreground">
          Your most practiced topics
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {summary.topTopics.map((topic, index) => (
            <div
              key={topic.topic}
              className="flex items-start justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg font-semibold text-primary">
                    #{index + 1}
                  </span>
                  <h3 className="font-semibold">{topic.topic}</h3>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{formatDuration(topic.timeSpent)}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <ActivityIcon className="h-4 w-4" />
                    <span>{topic.activities} activities</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {topic.lastActivity
                        ? formatDistanceToNow(new Date(topic.lastActivity), {
                            addSuffix: true,
                          })
                        : 'Never'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress bar showing relative time spent */}
              <div className="ml-4 w-24">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        summary.topTopics[0] ? (topic.timeSpent / summary.topTopics[0].timeSpent) * 100 : 0
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
