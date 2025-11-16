/**
 * Lesson View Layout
 * 
 * Provides layout structure for lesson pages with breadcrumb navigation
 * Requirements: 12.2
 */

import React from 'react';

export const metadata = {
  title: 'Lesson | Learning Platform',
  description: 'Interactive lesson with questions and immediate feedback',
};

export default function LessonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
