/**
 * Weak Areas Panel
 * 
 * Identifies and displays topics with low mastery or declining performance
 * with recommendations and quick action buttons.
 * 
 * Requirements: 9.4
 * Task: 9.6
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TopicBadge } from '@/components/learning-platform/layer-3-ui';
import { 
  AlertTriangle, 
  TrendingDown, 
  Target,
  ArrowRight,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LearningProgressMetrics } from '@/types/analytics-service';

interface WeakAreasPanelProps {
  progressData?: LearningProgressMetrics;
  isLoading: boolean;
}

export function WeakAreasPanel({ progressData, isLoading }: WeakAreasPanelProps) {
  const router = useRouter();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Generate mock weak areas data
  const weakAreas = generateMockWeakAreas();

  const handleStartPractice = (topic: string) => {
    // Navigate to practice mode with pre-selected topic
    router.push(`/practice?topic=${encodeURIComponent(topic)}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-semibold flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-orange-500" />
          Areas for Improvement
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Focus on these topics to boost your overall performance
        </p>
      </CardHeader>
      <CardContent>
        {weakAreas.length === 0 ? (
          <Alert>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription>
              Great job! You don't have any weak areas at the moment. Keep up the excellent work!
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-4">
            {weakAreas.map((area, index) => (
              <WeakAreaCard
                key={index}
                area={area}
                onStartPractice={handleStartPractice}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface WeakAreaCardProps {
  area: WeakArea;
  onStartPractice: (topic: string) => void;
}

function WeakAreaCard({ area, onStartPractice }: WeakAreaCardProps) {
  const severityConfig = getSeverityConfig(area.severity);

  return (
    <div className={cn(
      'p-4 rounded-lg border-2 transition-all hover:shadow-md',
      severityConfig.borderColor,
      severityConfig.bgColor
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <TopicBadge
              topic={area.topic}
              masteryLevel={area.currentMastery}
              showMastery
              size="md"
            />
            {area.trend === 'declining' && (
              <div className="flex items-center gap-1 text-xs text-red-600">
                <TrendingDown className="h-3 w-3" />
                <span>Declining</span>
              </div>
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            {area.recommendation}
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Current: {area.currentMastery}%</span>
            <span>•</span>
            <span>Target: {area.targetMastery}%</span>
            <span>•</span>
            <span>{area.questionsNeeded} questions to improve</span>
          </div>
        </div>
        <div className={cn('p-2 rounded-lg', severityConfig.iconBg)}>
          {severityConfig.icon}
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => onStartPractice(area.topic)}
          className="flex-1"
        >
          <Target className="h-4 w-4 mr-2" />
          Start Practice
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            // Navigate to topic details or learning path
            console.log('View details for:', area.topic);
          }}
        >
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Types
interface WeakArea {
  topic: string;
  currentMastery: number;
  targetMastery: number;
  trend: 'stable' | 'declining';
  severity: 'high' | 'medium' | 'low';
  recommendation: string;
  questionsNeeded: number;
}

// Helper functions
function getSeverityConfig(severity: 'high' | 'medium' | 'low') {
  switch (severity) {
    case 'high':
      return {
        borderColor: 'border-red-300',
        bgColor: 'bg-red-50',
        iconBg: 'bg-red-100',
        icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
      };
    case 'medium':
      return {
        borderColor: 'border-orange-300',
        bgColor: 'bg-orange-50',
        iconBg: 'bg-orange-100',
        icon: <AlertTriangle className="h-5 w-5 text-orange-600" />,
      };
    case 'low':
      return {
        borderColor: 'border-yellow-300',
        bgColor: 'bg-yellow-50',
        iconBg: 'bg-yellow-100',
        icon: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
      };
  }
}

function generateMockWeakAreas(): WeakArea[] {
  return [
    {
      topic: 'Parking',
      currentMastery: 45,
      targetMastery: 80,
      trend: 'stable',
      severity: 'high',
      recommendation: 'Focus on parallel parking and angle parking techniques. Review the official manual sections 4.2-4.5.',
      questionsNeeded: 15,
    },
    {
      topic: 'Vehicle Maintenance',
      currentMastery: 55,
      targetMastery: 80,
      trend: 'declining',
      severity: 'medium',
      recommendation: 'Review basic maintenance procedures and warning light meanings. Practice identifying common issues.',
      questionsNeeded: 12,
    },
    {
      topic: 'Emergency Procedures',
      currentMastery: 65,
      targetMastery: 80,
      trend: 'stable',
      severity: 'low',
      recommendation: 'Strengthen your knowledge of emergency response protocols and hazard recognition.',
      questionsNeeded: 8,
    },
  ];
}
