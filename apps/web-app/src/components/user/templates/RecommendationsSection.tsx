'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Lightbulb, Target, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export type RecommendationPriority = 'high' | 'medium' | 'low';

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: RecommendationPriority;
  estimatedImpact: number; // 1-10 scale
  actionLabel: string;
  actionUrl?: string;
  onAction?: () => void;
}

interface RecommendationsSectionProps {
  recommendations: Recommendation[];
  className?: string;
}

export function RecommendationsSection({ recommendations, className }: RecommendationsSectionProps) {
  const getPriorityColor = (priority: RecommendationPriority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    }
  };

  const getImpactIcon = (impact: number) => {
    if (impact >= 8) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (impact >= 5) return <Target className="h-4 w-4 text-yellow-600" />;
    return <Lightbulb className="h-4 w-4 text-blue-600" />;
  };

  // Sort by priority (high first) and then by impact
  const sortedRecommendations = [...recommendations].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.estimatedImpact - a.estimatedImpact;
  });

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sortedRecommendations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No recommendations at this time.</p>
            <p className="text-sm mt-2">Keep up the great work!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedRecommendations.map((recommendation) => (
              <div
                key={recommendation.id}
                className="p-4 border rounded-lg space-y-3 hover:bg-accent/50 transition-colors"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-medium flex-1">{recommendation.title}</h4>
                  <Badge className={cn('text-xs', getPriorityColor(recommendation.priority))}>
                    {recommendation.priority}
                  </Badge>
                </div>

                {/* Description */}
                <p className="text-sm text-muted-foreground">{recommendation.description}</p>

                {/* Impact and Action */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    {getImpactIcon(recommendation.estimatedImpact)}
                    <span className="text-muted-foreground">
                      Impact: {recommendation.estimatedImpact}/10
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={recommendation.onAction}
                    className="gap-2"
                  >
                    {recommendation.actionLabel}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
