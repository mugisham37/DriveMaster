/**
 * Analytics Initializer Component
 * 
 * Initializes analytics tracking and page view tracking
 * Requirements: 9.1
 * Task: 17.5
 */

'use client';

import { useAnalyticsInit, usePageViewTracking } from '@/hooks/useAnalyticsTracking';

export function AnalyticsInitializer() {
  // Initialize analytics with user context
  useAnalyticsInit();
  
  // Track page views automatically
  usePageViewTracking();
  
  // This component doesn't render anything
  return null;
}
