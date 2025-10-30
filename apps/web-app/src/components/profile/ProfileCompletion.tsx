'use client'

/**
 * Profile Completion Component
 * 
 * Implements guided setup flows with:
 * - Step-by-step profile completion
 * - Progress tracking and visualization
 * - Smart recommendations for missing fields
 * - Onboarding flow integration
 * - Requirements: 1.1, 1.2, 1.3, 1.4
 */

import React, { useState, useCallback, useMemo } from 'react'
import { useUser } from '@/contexts/UserContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { CheckCircle, Circle, ArrowRight, Star, Gift, Target } from 'lucide-react'

export interface ProfileCompletionProps {
  className?: string
  onStepComplete?: (step: string) => void
  showRewards?: boolean
}

interface CompletionStep {
  id: string
  title: string
  description: string
  field: string
  completed: boolean
  required: boolean
  points: number
  icon: React.ReactNode
}

export function ProfileCompletion({ 
  className, 
  onStepComplete, 
  showRewards = true 
}: ProfileCompletionProps) {
  const {
    profile,
    isLoading,
    checkProfileCompleteness,
    getDisplayName,
  } = useUser()

  const [expandedStep, setExpandedStep] = useState<string | null>(null)

  const completeness = checkProfileCompleteness()

  const steps: CompletionStep[] = useMemo(() => [
    {
      id: 'email',
      title: 'Add Email Address',
      description: 'Verify your email to secure your account and receive important updates',
      field: 'email',
      completed: !!profile?.email,
      required: true,
      points: 100,
      icon: <Circle className="h-4 w-4" />,
    },
    {
      id: 'timezone',
      title: 'Set Your Timezone',
      description: 'Help us show you content at the right time for your location',
      field: 'timezone',
      completed: !!profile?.timezone,
      required: true,
      points: 50,
      icon: <Circle className="h-4 w-4" />,
    },
    {
      id: 'language',
      title: 'Choose Your Language',
      description: 'Select your preferred language for the best learning experience',
      field: 'language',
      completed: !!profile?.language,
      required: true,
      points: 50,
      icon: <Circle className="h-4 w-4" />,
    },
    {
      id: 'country',
      title: 'Select Your Country',
      description: 'Help us provide region-specific content and features',
      field: 'countryCode',
      completed: !!profile?.countryCode,
      required: true,
      points: 50,
      icon: <Circle className="h-4 w-4" />,
    },
  ], [profile])

  const completedSteps = steps.filter(step => step.completed)
  const nextStep = steps.find(step => !step.completed)
  const totalPoints = steps.reduce((sum, step) => sum + (step.completed ? step.points : 0), 0)
  const maxPoints = steps.reduce((sum, step) => sum + step.points, 0)
  const completionPercentage = Math.round((completedSteps.length / steps.length) * 100)

  const handleStepClick = useCallback((stepId: string) => {
    setExpandedStep(expandedStep === stepId ? null : stepId)
    if (onStepComplete) {
      onStepComplete(stepId)
    }
  }, [expandedStep, onStepComplete])

  const getStepAction = useCallback((step: CompletionStep) => {
    switch (step.id) {
      case 'email':
        return 'Go to Profile Settings'
      case 'timezone':
        return 'Set Timezone'
      case 'language':
        return 'Choose Language'
      case 'country':
        return 'Select Country'
      default:
        return 'Complete Step'
    }
  }, [])

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-2 bg-gray-200 rounded"></div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (completeness.isComplete) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Profile Complete!</h3>
              <p className="text-muted-foreground">
                Great job, {getDisplayName()}! Your profile is fully set up.
              </p>
            </div>
            {showRewards && (
              <div className="flex items-center justify-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">{maxPoints} points earned</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Complete Your Profile
          </CardTitle>
          <Badge variant="secondary">
            {completedSteps.length}/{steps.length} Complete
          </Badge>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Progress</span>
            <span>{completionPercentage}%</span>
          </div>
          <Progress value={completionPercentage} className="h-2" />
        </div>

        {showRewards && (
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500" />
              <span>{totalPoints}/{maxPoints} points</span>
            </div>
            {nextStep && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Gift className="h-4 w-4" />
                <span>+{nextStep.points} points next</span>
              </div>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {nextStep && (
          <Alert>
            <Target className="h-4 w-4" />
            <AlertDescription>
              <strong>Next step:</strong> {nextStep.title} - {nextStep.description}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={step.id} className="space-y-2">
              <div 
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  step.completed 
                    ? 'bg-green-50 border-green-200' 
                    : expandedStep === step.id
                    ? 'bg-blue-50 border-blue-200'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => handleStepClick(step.id)}
              >
                <div className="flex-shrink-0">
                  {step.completed ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className={`font-medium ${step.completed ? 'text-green-900' : ''}`}>
                      {step.title}
                    </h4>
                    {step.required && (
                      <Badge variant="outline" className="text-xs">
                        Required
                      </Badge>
                    )}
                    {showRewards && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="h-3 w-3" />
                        <span>{step.points}</span>
                      </div>
                    )}
                  </div>
                  <p className={`text-sm ${
                    step.completed ? 'text-green-700' : 'text-muted-foreground'
                  }`}>
                    {step.description}
                  </p>
                </div>

                {!step.completed && (
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                )}
              </div>

              {expandedStep === step.id && !step.completed && (
                <div className="ml-8 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-900 mb-3">
                    Complete this step to improve your profile and earn {step.points} points.
                  </p>
                  <Button size="sm" className="w-full">
                    {getStepAction(step)}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        {completedSteps.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Completed Steps</h4>
              <div className="grid grid-cols-2 gap-2">
                {completedSteps.map((step) => (
                  <div 
                    key={step.id}
                    className="flex items-center gap-2 text-sm text-green-700"
                  >
                    <CheckCircle className="h-3 w-3" />
                    <span>{step.title}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {!completeness.isComplete && (
          <Alert>
            <Gift className="h-4 w-4" />
            <AlertDescription>
              Complete your profile to unlock all features and earn rewards!
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

export default ProfileCompletion