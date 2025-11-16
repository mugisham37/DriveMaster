/**
 * Practice Mode Layout
 * 
 * Provides error boundary and layout structure for practice pages
 * Requirements: 14.3
 */

import React from 'react';
import { RouteErrorBoundary } from '@/components/error-boundaries';

export const metadata = {
  title: 'Practice Mode',
  description: 'Practice specific topics with adaptive difficulty. Focus on your weak areas and improve your skills.',
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
