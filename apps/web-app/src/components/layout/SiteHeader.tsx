'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Icon } from '@/lib/assets';
import { UserMenu } from './UserMenu';
import { NotificationsDropdown } from './NotificationsDropdown';
import { ReputationDropdown } from './ReputationDropdown';
import { ExploreDropdown } from './ExploreDropdown';
import { ThemeToggleButton } from '@/components/common/ThemeToggleButton';
import { 
  GenericNav, 
  LEARN_SUBMENU, 
  DISCOVER_SUBMENU, 
  CONTRIBUTE_SUBMENU, 
  MORE_SUBMENU 
} from './navigation/NavigationHelpers';

interface NavigationItem {
  title: string;
  path: string;
  submenu?: NavigationItem[];
  offset?: number;
  hasView?: boolean;
  view?: string;
  cssClass?: string;
}

// Navigation submenus are now imported from NavigationHelpers

export function SiteHeader() {
  const { data: session, status } = useSession();
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  const isSignedIn = status === 'authenticated' && !!session?.user;
  const isLoading = status === 'loading';

  // Don't render until client-side to avoid hydration mismatch
  if (!isClient) {
    return null;
  }

  return (
    <header id="site-header">
      {/* Announcement Bar */}
      <AnnouncementBar isSignedIn={isSignedIn} />
      
      <div className="lg-container container">
        {/* Logo */}
        <Link href="/" className="exercism-link xl:block" data-turbo-frame="tf-main">
          <Icon icon="exercism-with-logo-black" alt="Exercism" />
        </Link>

        {/* Docs Search */}
        <div className="docs-search">
          <div className="c-search-bar">
            <input 
              className="--search" 
              placeholder="Search Exercism's docs..." 
              type="text"
            />
          </div>
        </div>

        {/* Contextual Section */}
        <div className="contextual-section">
          {isLoading ? (
            <div className="loading-placeholder" />
          ) : isSignedIn ? (
            <SignedInSection user={session.user} />
          ) : (
            <SignedOutSection />
          )}
        </div>
      </div>
    </header>
  );
}

function AnnouncementBar({ isSignedIn }: { isSignedIn: boolean }) {
  if (isSignedIn) {
    // For signed-in users, show donation bar if they haven't donated recently
    // This would need to check user's donation status
    return null;
  }

  // For signed-out users, show coding fundamentals announcement
  return (
    <Link 
      href="/courses/coding-fundamentals" 
      className="announcement-bar md:block hidden"
    >
      <div className="lg-container">
        <span className="emoji mr-6">👋</span>
        <span>Learning to code? Check out our </span>
        <strong>Coding Fundamentals</strong>
        <span> course for beginners!</span>
      </div>
    </Link>
  );
}

function SignedInSection({ user }: { user: { handle?: string; name?: string; reputation?: string; isMentor?: boolean; isInsider?: boolean } }) {
  return (
    <>
      <SignedInNav />
      <div className="user-section">
        <NewTestimonialIcon />
        <NewBadgeIcon />
        <Link href="/notifications" className="notifications-link">
          <Icon icon="notification" alt="Notifications" />
        </Link>
        <NotificationsDropdown />
        <ReputationDropdown user={user} />
        {user.isInsider && (
          <Link href="/admin" className="admin-link">
            <Icon icon="settings" alt="Admin" />
          </Link>
        )}
        <UserMenu />
      </div>
    </>
  );
}

function SignedInNav() {
  const { data: session } = useSession();
  const isMentor = session?.user?.isMentor;

  const MENTORING_SUBMENU: NavigationItem[] = [
    { 
      title: 'Inbox', 
      description: 'Your mentoring discussions',
      path: '/mentoring/inbox',
      icon: 'overview'
    },
    { 
      title: 'Queue', 
      description: 'Find students to help',
      path: '/mentoring/queue',
      icon: 'queue'
    },
    { 
      title: 'Automation', 
      description: 'Automated feedback tools',
      path: '/mentoring/automation',
      icon: 'automation'
    },
  ];

  return (
    <nav className="signed-in" role="navigation">
      <ul>
        <GenericNav 
          navTitle="Learn" 
          submenu={LEARN_SUBMENU} 
          path="/tracks" 
          hasView={true} 
        />
        <GenericNav 
          navTitle="Discover" 
          submenu={DISCOVER_SUBMENU} 
          path="/community" 
          offset={20} 
        />
        <GenericNav 
          navTitle="Contribute" 
          submenu={CONTRIBUTE_SUBMENU} 
          path="/contributing" 
          offset={20} 
        />
        {isMentor && (
          <GenericNav 
            navTitle="Mentoring" 
            submenu={MENTORING_SUBMENU} 
            path="/mentoring" 
            offset={20} 
            cssClass="mentoring" 
          />
        )}
        <GenericNav 
          navTitle="More" 
          submenu={MORE_SUBMENU} 
          offset={0} 
        />
        <GenericNav 
          navTitle="Insiders" 
          path="/insiders" 
          offset={150} 
          hasView={true} 
          cssClass="insiders" 
        />
        <ThemeToggleButton />
      </ul>
    </nav>
  );
}

function SignedOutSection() {
  return (
    <>
      <SignedOutNav />
      <div className="auth-buttons">
        <Link href="/auth/register" className="btn-primary btn-xs">
          Sign up
        </Link>
        <Link href="/auth/signin" className="btn-secondary btn-xs">
          Log in
        </Link>
      </div>
      <ExploreDropdown />
    </>
  );
}

function SignedOutNav() {
  return (
    <nav role="navigation">
      <ul>
        <GenericNav 
          navTitle="Learn" 
          submenu={LEARN_SUBMENU} 
          path="/tracks" 
        />
        <GenericNav 
          navTitle="Discover" 
          submenu={DISCOVER_SUBMENU} 
          path="/community" 
          offset={20} 
        />
        <GenericNav 
          navTitle="Contribute" 
          submenu={CONTRIBUTE_SUBMENU} 
          path="/contributing" 
          offset={20} 
        />
        <GenericNav 
          navTitle="More" 
          submenu={MORE_SUBMENU} 
          offset={0} 
        />
      </ul>
    </nav>
  );
}

// GenericNav is now imported from NavigationHelpers

function NewTestimonialIcon() {
  // TODO: Check if user has unrevealed testimonials
  const hasUnrevealedTestimonials = false;
  
  if (!hasUnrevealedTestimonials) return null;
  
  return (
    <Link href="/mentoring/testimonials" className="new-testimonial">
      <span className="sr-only">New testimonial available</span>
    </Link>
  );
}

function NewBadgeIcon() {
  // TODO: Check if user has unrevealed badges
  const hasUnrevealedBadges = false;
  
  if (!hasUnrevealedBadges) return null;
  
  return (
    <Link href="/journey#journey-content" className="new-badge">
      <span className="sr-only">New badge available</span>
    </Link>
  );
}