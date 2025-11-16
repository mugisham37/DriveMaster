/**
 * Learn Section Layout
 * 
 * Provides consistent layout for all learning pages
 */

import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard',
  description: 'Your learning hub. Track your progress, continue lessons, and discover personalized recommendations.',
};

export default function LearnLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
