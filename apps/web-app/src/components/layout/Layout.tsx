'use client';

import { ReactNode } from 'react';
import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';

interface LayoutProps {
  children: ReactNode;
  className?: string;
}

export function Layout({
  children,
  className = '',
}: LayoutProps) {
  return (
    <div className={`min-h-screen flex flex-col ${className}`}>
      <SiteHeader />
      
      {/* Main content area */}
      <main className="flex-1">
        {children}
      </main>
      
      <SiteFooter />
    </div>
  );
}