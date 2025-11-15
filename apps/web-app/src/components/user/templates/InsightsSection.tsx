/**
 * InsightsSection Component
 * 
 * Displays AI-generated insights with severity indicators, actionable recommendations,
 * and grouping by category (engagement, performance, behavior).
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  Info,
  AlertTriangle,
  TrendingUp,
  Target,
  Brain,
  ArrowRight,
} from 'lucide-react';
import { ActivityInsight } from '@/types/user-service';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface InsightsSectionProps {
  insights?: ActivityInsight[] | undefined;
  isLoading?: boolean;
  onActionClick?: (insight: ActivityInsight) => void;
  className?: string;
}

const SEVERITY_CONFIG = {
  info: {
    icon: Info,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-yellow-600 dark:text-yellow-400',
    bg: 'bg-yellow-100 dark:bg-yellow-900/20',
    border: 'border-yellow-200 dark:border-yellow-800',
  },
  critical: {
    icon: AlertCircle,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-100 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
  },
};

const CATEGORY_CONFIG = {
  engagement: {
    icon: TrendingUp,
    label: 'Engagement',
    color: 'text-green-600',
  },
  performance: {
    icon: Target,
    label: 'Performance',
    color: 'text-purple-600',
  },
  behavior: {
    icon: Brain,
    label: 'Behavior',
    color: 'text-blue-600',
  },
};

export function InsightsSection({
  insights = [],
  isLoading,
  onActionClick,
  className = '',
}: InsightsSectionProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!insights || insights.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Insights & Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No insights available yet</p>
          <p className="text-sm mt-1">Keep learning to generate personalized insights</p>
        </CardContent>
      </Card>
    );
  }

  // Group insights by category
  const groupedInsights = insights.reduce((acc, insight) => {
    const category = insight.category || 'engagement';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(insight);
    return acc;
  }, {} as Record<string, ActivityInsight[]>);

  const renderInsight = (insight: ActivityInsight) => {
    const severityConfig = SEVERITY_CONFIG[insight.severity] || SEVERITY_CONFIG.info;
    const SeverityIcon = severityConfig.icon;

    return (
      <div
        key={insight.id}
        className={`p-4 rounded-lg border ${severityConfig.border} ${severityConfig.bg}`}
      >
        <div className="flex items-start gap-3">
          <SeverityIcon className={`h-5 w-5 mt-0.5 ${severityConfig.color}`} />
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="font-semibold">{insight.title}</h4>
              <Badge variant="outline" className="text-xs">
                {insight.severity}
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground mb-3">
              {insight.description}
            </p>

            {insight.actionItems && insight.actionItems.length > 0 && (
              <div className="flex items-start gap-2 mb-3 p-3 bg-background/50 rounded-md">
                <ArrowRight className="h-4 w-4 mt-0.5 text-primary" />
                <div className="text-sm">
                  {insight.actionItems.map((item, idx) => (
                    <p key={idx}>{item}</p>
                  ))}
                </div>
              </div>
            )}

            {insight.actionable && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onActionClick?.(insight)}
                className="mt-2"
              >
                Take Action
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Insights & Recommendations</CardTitle>
        <p className="text-sm text-muted-foreground">
          AI-powered insights to improve your learning
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">
              All ({insights.length})
            </TabsTrigger>
            {Object.keys(CATEGORY_CONFIG).map((category) => {
              const count = groupedInsights[category]?.length || 0;
              const config = CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG];
              const Icon = config.icon;
              return (
                <TabsTrigger key={category} value={category}>
                  <Icon className="h-4 w-4 mr-1" />
                  {config.label} ({count})
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="all" className="mt-4 space-y-4">
            {insights.map(renderInsight)}
          </TabsContent>

          {Object.keys(CATEGORY_CONFIG).map((category) => (
            <TabsContent key={category} value={category} className="mt-4 space-y-4">
              {groupedInsights[category]?.length > 0 ? (
                groupedInsights[category].map(renderInsight)
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No {category} insights available
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
