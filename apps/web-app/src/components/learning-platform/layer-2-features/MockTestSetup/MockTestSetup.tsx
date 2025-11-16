'use client';

/**
 * Mock Test Setup Component
 * 
 * Setup screen for mock test with instructions and configuration
 * Requirements: 15.1
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Clock, FileText, CheckCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export interface MockTestSetupProps {
  onStart: (jurisdiction: string) => void;
}

const JURISDICTIONS = [
  { value: 'ontario', label: 'Ontario' },
  { value: 'british-columbia', label: 'British Columbia' },
  { value: 'alberta', label: 'Alberta' },
  { value: 'quebec', label: 'Quebec' },
  { value: 'manitoba', label: 'Manitoba' },
  { value: 'saskatchewan', label: 'Saskatchewan' },
];

const TEST_CONFIG = {
  questionCount: 40,
  timeLimit: 60, // minutes
  passingScore: 80, // percentage
};

export function MockTestSetup({ onStart }: MockTestSetupProps) {
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<string>('ontario');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleStartClick = () => {
    setShowConfirmDialog(true);
  };

  const handleConfirmStart = () => {
    setShowConfirmDialog(false);
    onStart(selectedJurisdiction);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Mock Driving Test</h1>
        <p className="text-muted-foreground">
          Take a full-length practice test to assess your readiness
        </p>
      </div>

      {/* Test Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle>Test Overview</CardTitle>
          <CardDescription>
            This mock test simulates the actual driving knowledge test
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
              <FileText className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="font-semibold">{TEST_CONFIG.questionCount} Questions</p>
                <p className="text-sm text-muted-foreground">Multiple choice format</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
              <Clock className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="font-semibold">{TEST_CONFIG.timeLimit} Minutes</p>
                <p className="text-sm text-muted-foreground">Timed test with countdown</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
              <CheckCircle className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="font-semibold">{TEST_CONFIG.passingScore}% to Pass</p>
                <p className="text-sm text-muted-foreground">Minimum passing score</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Jurisdiction Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Jurisdiction</CardTitle>
          <CardDescription>
            Choose the jurisdiction for your test
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedJurisdiction} onValueChange={setSelectedJurisdiction}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select jurisdiction" />
            </SelectTrigger>
            <SelectContent>
              {JURISDICTIONS.map((jurisdiction) => (
                <SelectItem key={jurisdiction.value} value={jurisdiction.value}>
                  {jurisdiction.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle>Test Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <p className="font-medium">Before you begin:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Find a quiet place where you won&apos;t be interrupted</li>
                <li>Ensure you have a stable internet connection</li>
                <li>You will have {TEST_CONFIG.timeLimit} minutes to complete {TEST_CONFIG.questionCount} questions</li>
                <li>The test will auto-submit when time expires</li>
                <li>You can navigate between questions and flag questions for review</li>
                <li>You need {TEST_CONFIG.passingScore}% or higher to pass</li>
                <li>Your progress will be saved automatically</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Start Button */}
      <div className="flex justify-center pt-4">
        <Button
          size="lg"
          onClick={handleStartClick}
          className="min-w-48"
        >
          Start Mock Test
        </Button>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ready to begin?</AlertDialogTitle>
            <AlertDialogDescription>
              Once you start the test, the timer will begin immediately. Make sure you&apos;re ready and have {TEST_CONFIG.timeLimit} minutes available.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmStart}>
              Start Test
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
