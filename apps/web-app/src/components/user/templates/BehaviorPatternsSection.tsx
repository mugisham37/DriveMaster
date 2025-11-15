/**
 * BehaviorPatternsSection Component
 * 
 * Displays detected behavior patterns with confidence levels and explanations.
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, TrendingUp, Clock, Calendar, Zap } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface BehaviorPattern {
  id: string;
  pattern: string;
  confidence: number; // 0-1
  explanation: string;
  icon?: 'brain' | 'trending' | 'clock' | 'calendar' | 'zap';
}

interface BehaviorPatternsSectionProps {
  patterns?: BehaviorPattern[];
  isLoading?: boolean;
  className?: string;
}

const PATTERN_ICONS = {
  brain: Brain,
  trending: TrendingUp,
  clock: Clock,
  calendar: Calendar,
  zap: Zap,
};

// Mock patterns - replace with real data from API
const MOCK_PATTERNS: BehaviorPattern[] = [
  {
    id: '1',
    pattern: 'You study most effectively in the morning',
    confidence: 0.85,
    explanation: 'Your engagement scores are 40% higher during morning sessions (6 AM - 12 PM)',
    icon: 'clock',
  },
  {
    id: '2',
    pattern: 'You prefer shorter, frequent sessions',
    confidence: 0.78,
    explanation: 'You complete 85% of sessions under 30 minutes with high engagement',
    icon: 'trending',
  },
  {
    id: '3',
    pattern: 'Weekends show lower activity',
    confidence: 0.92,
    explanation: 'Your weekend activity is 60% lower than weekdays on average',
    icon: 'calendar',
  },
  {
    id: '4',
    pattern: 'You learn best with spaced repetition',
    confidence: 0.73,
    explanation: 'Topics reviewed 2-3 days apart show 35% better retention',
    icon: 'brain',
  },
];

export function BehaviorPatternsSection({
  patterns = MOCK_PATTERNS,
  isLoading,
  className = '',
}: BehaviorPatternsSectionProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!patterns || patterns.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Behavior Patterns</CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>No patterns detected yet</p>
          <p className="text-sm mt-1">We need more data to identify your learning patterns</p>
        </CardContent>
      </Card>
    );
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 dark:text-green-400';
    if (confidence >= 0.6) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-orange-600 dark:text-orange-400';
  };

  const getConfidenceBg = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 dark:bg-green-900/20';
    if (confidence >= 0.6) return 'bg-yellow-100 dark:bg-yellow-900/20';
    return 'bg-orange-100 dark:bg-orange-900/20';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Behavior Patterns
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Insights about your learning habits
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {patterns.map((pattern) => {
            const Icon = PATTERN_ICONS[pattern.icon || 'brain'];
            
            return (
              <div
                key={pattern.id}
                className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-semibold">{pattern.pattern}</h4>
                      <Badge
                        variant="outline"
                        className={`${getConfidenceBg(pattern.confidence)} ${getConfidenceColor(
                          pattern.confidence
                        )} border-0`}
                      >
                        {getConfidenceLabel(pattern.confidence)} confidence
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {pattern.explanation}
                    </p>

                    {/* Confidence bar */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>Confidence</span>
                        <span>{Math.round(pattern.confidence * 100)}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            pattern.confidence >= 0.8
                              ? 'bg-green-600'
                              : pattern.confidence >= 0.6
                              ? 'bg-yellow-600'
                              : 'bg-orange-600'
                          }`}
                          style={{ width: `${pattern.confidence * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
