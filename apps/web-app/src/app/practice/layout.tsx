/**
 * Practice Mode Layout
 * 
 * Provides error boundary and layout structure for practice pages
 * Requirements: 14.3
 */

import React from 'react';
import { RouteErrorBoundary } from '@/components/error-boundaries';

export const metadata = {
  title: 'Practice Mode | Learning Platform',
  description: 'Practice with adaptive difficulty and targeted topic focus',
};

export default function PracticeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteErrorBoundary>
      {children}
    </RouteErrorBoundary>
  );
}
