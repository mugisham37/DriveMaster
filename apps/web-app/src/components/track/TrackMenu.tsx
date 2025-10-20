'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Dropdown } from '@/components/common/Dropdown';
import { Icon } from '@/lib/assets';
import { Track } from '@/types';

interface UserTrack {
  id: number;
  slug: string;
  isJoined: boolean;
  isExternal: boolean;
  isCourse: boolean;
  isPracticeMode: boolean;
}

interface TrackMenuProps {
  track: Track;
  userTrack?: UserTrack | undefined;
}

interface TrackMenuLinks {
  repo: string;
  documentation: string;
  buildStatus: string;
  reset?: string;
  leave?: string;
  activatePracticeMode?: string;
  activateLearningMode?: string;
}

export function TrackMenu({ track, userTrack }: TrackMenuProps) {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState<string | null>(null);

  if (!session?.user) {
    return null;
  }

  const links: TrackMenuLinks = {
    repo: track.links?.repo || `https://github.com/exercism/${track.slug}`,
    documentation: `/tracks/${track.slug}/docs`,
    buildStatus: `/tracks/${track.slug}/build`
  };

  // Add user-specific links if track is joined and not external
  if (userTrack?.isJoined && !userTrack.isExternal) {
    links.reset = `/api/tracks/${track.slug}/reset`;
    links.leave = `/api/tracks/${track.slug}/leave`;

    if (userTrack.isCourse) {
      if (!userTrack.isPracticeMode) {
        links.activatePracticeMode = `/api/tracks/${track.slug}/activate-practice-mode`;
      } else {
        links.activateLearningMode = `/api/tracks/${track.slug}/activate-learning-mode`;
      }
    }
  }

  const handleAction = async (actionUrl: string, actionName: string) => {
    setIsLoading(actionName);
    try {
      const response = await fetch(actionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to ${actionName}`);
      }

      await response.json();
      
      // Refresh the page to reflect changes
      window.location.reload();
    } catch (error) {
      console.error(`Error ${actionName}:`, error);
      // TODO: Show error toast/notification
    } finally {
      setIsLoading(null);
    }
  };

  const menuButton = (
    <button
      className="track-menu-trigger btn-xs btn-enhanced"
      aria-label="Track options menu"
    >
      <Icon icon="more-horizontal" alt="" />
      <span>Options</span>
      <Icon icon="chevron-down" alt="" />
    </button>
  );

  const menuItems = (
    <div className="track-menu-content">
      <nav className="track-menu-nav">
        <ul>
          {/* External Links */}
          <li>
            <Link 
              href={links.repo}
              target="_blank"
              rel="noopener noreferrer"
              className="menu-item external"
            >
              <Icon icon="external-link" alt="" />
              <span>View Repository</span>
            </Link>
          </li>
          <li>
            <Link 
              href={links.documentation}
              className="menu-item"
            >
              <Icon icon="docs" alt="" />
              <span>Documentation</span>
            </Link>
          </li>
          <li>
            <Link 
              href={links.buildStatus}
              className="menu-item"
            >
              <Icon icon="build" alt="" />
              <span>Build Status</span>
            </Link>
          </li>

          {/* User-specific actions */}
          {userTrack?.isJoined && !userTrack.isExternal && (
            <>
              <li className="divider" />
              
              {/* Mode switching for course tracks */}
              {userTrack.isCourse && (
                <>
                  {links.activatePracticeMode && (
                    <li>
                      <button
                        onClick={() => handleAction(links.activatePracticeMode!, 'activate practice mode')}
                        disabled={isLoading === 'activate practice mode'}
                        className="menu-item action"
                      >
                        <Icon icon="practice-mode" alt="" />
                        <span>
                          {isLoading === 'activate practice mode' ? 'Activating...' : 'Switch to Practice Mode'}
                        </span>
                      </button>
                    </li>
                  )}
                  
                  {links.activateLearningMode && (
                    <li>
                      <button
                        onClick={() => handleAction(links.activateLearningMode!, 'activate learning mode')}
                        disabled={isLoading === 'activate learning mode'}
                        className="menu-item action"
                      >
                        <Icon icon="learning-mode" alt="" />
                        <span>
                          {isLoading === 'activate learning mode' ? 'Activating...' : 'Switch to Learning Mode'}
                        </span>
                      </button>
                    </li>
                  )}
                </>
              )}

              {/* Destructive actions */}
              <li className="divider" />
              
              {links.reset && (
                <li>
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to reset your progress on this track? This action cannot be undone.')) {
                        handleAction(links.reset!, 'reset track');
                      }
                    }}
                    disabled={isLoading === 'reset track'}
                    className="menu-item action destructive"
                  >
                    <Icon icon="reset" alt="" />
                    <span>
                      {isLoading === 'reset track' ? 'Resetting...' : 'Reset Track'}
                    </span>
                  </button>
                </li>
              )}
              
              {links.leave && (
                <li>
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to leave this track? You will lose all progress.')) {
                        handleAction(links.leave!, 'leave track');
                      }
                    }}
                    disabled={isLoading === 'leave track'}
                    className="menu-item action destructive"
                  >
                    <Icon icon="leave" alt="" />
                    <span>
                      {isLoading === 'leave track' ? 'Leaving...' : 'Leave Track'}
                    </span>
                  </button>
                </li>
              )}
            </>
          )}
        </ul>
      </nav>
    </div>
  );

  return (
    <Dropdown
      menuButton={menuButton}
      menuItems={menuItems}
      className="track-menu"
      persistent={true}
    />
  );
}