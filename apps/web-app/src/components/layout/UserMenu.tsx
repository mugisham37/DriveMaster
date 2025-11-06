'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Avatar } from '@/components/common/Avatar';
import { 
  ChevronDown, 
  User, 
  Settings, 
  Map, 
  Users, 
  Shield, 
  GitPullRequest, 
  LogOut 
} from 'lucide-react';

export function UserMenu() {
  const { user, isAuthenticated, isLoading, isMentor, isInsider, logout, state } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Show loading state during authentication initialization
  if (isLoading) {
    return (
      <div className="w-10 h-10 bg-gray-200 animate-pulse rounded-full" />
    );
  }

  // Don't render if not authenticated or no user data
  if (!isAuthenticated || !user) return null;

  return (
    <div className="user-menu" ref={menuRef}>
      <button
        className="user-menu-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Avatar 
          user={{
            avatarUrl: user.avatarUrl || '',
            handle: user.handle || user.name || '',
            flair: user.flair ? { ...user.flair, id: user.flair.id.toString() } : null
          }} 
          size="small"
        />
        <ChevronDown className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="user-menu-dropdown">
          <div className="user-info">
            <Avatar 
              user={{
                avatarUrl: user.avatarUrl || '',
                handle: user.handle || user.name || '',
                flair: user.flair ? { ...user.flair, id: user.flair.id.toString() } : null
              }} 
              size="medium"
            />
            <div className="user-details">
              <div className="handle">@{user.handle || user.name}</div>
              {user.reputation && (
                <div className="reputation">{user.reputation} reputation</div>
              )}
            </div>
          </div>

          <hr className="divider" />

          <nav className="menu-nav">
            <ul>
              <li>
                <Link 
                  href={`/profiles/${user.handle || user.name}`}
                  className="menu-link"
                  onClick={() => setIsOpen(false)}
                >
                  <User className="w-4 h-4" />
                  <span>Public Profile</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="/settings"
                  className="menu-link"
                  onClick={() => setIsOpen(false)}
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="/journey"
                  className="menu-link"
                  onClick={() => setIsOpen(false)}
                >
                  <Map className="w-4 h-4" />
                  <span>Your Journey</span>
                </Link>
              </li>
              {isMentor && (
                <li>
                  <Link 
                    href="/mentoring"
                    className="menu-link"
                    onClick={() => setIsOpen(false)}
                  >
                    <Users className="w-4 h-4" />
                    <span>Mentoring</span>
                  </Link>
                </li>
              )}
              {isInsider && (
                <li>
                  <Link 
                    href="/insiders"
                    className="menu-link"
                    onClick={() => setIsOpen(false)}
                  >
                    <Shield className="w-4 h-4" />
                    <span>Insiders</span>
                  </Link>
                </li>
              )}
              <li>
                <Link 
                  href="/contributing"
                  className="menu-link"
                  onClick={() => setIsOpen(false)}
                >
                  <GitPullRequest className="w-4 h-4" />
                  <span>Contributing</span>
                </Link>
              </li>
            </ul>
          </nav>

          <hr className="divider" />

          <div className="menu-actions">
            <button
              className="sign-out-btn"
              onClick={async () => {
                setIsOpen(false);
                try {
                  await logout();
                  // Redirect is handled by AuthContext
                } catch (error) {
                  console.error('Logout failed:', error);
                  // Still close menu even if logout fails
                }
              }}
              disabled={state.isLogoutLoading}
            >
              <LogOut className="w-4 h-4" />
              <span>{state.isLogoutLoading ? 'Signing Out...' : 'Sign Out'}</span>
            </button>
            {state.error && (
              <div className="text-red-500 text-sm mt-2 px-3">
                {state.error.message}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}