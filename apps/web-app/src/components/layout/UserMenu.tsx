'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { Avatar } from '@/components/common/Avatar';
import { Icon } from '@/lib/assets';

export function UserMenu() {
  const { data: session } = useSession();
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

  if (!session?.user) return null;

  const user = session.user;

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
        <Icon icon="chevron-down" alt="" />
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
                  <Icon icon="profile" alt="" />
                  <span>Public Profile</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="/settings"
                  className="menu-link"
                  onClick={() => setIsOpen(false)}
                >
                  <Icon icon="settings" alt="" />
                  <span>Settings</span>
                </Link>
              </li>
              <li>
                <Link 
                  href="/journey"
                  className="menu-link"
                  onClick={() => setIsOpen(false)}
                >
                  <Icon icon="journey" alt="" />
                  <span>Your Journey</span>
                </Link>
              </li>
              {user.isMentor && (
                <li>
                  <Link 
                    href="/mentoring"
                    className="menu-link"
                    onClick={() => setIsOpen(false)}
                  >
                    <Icon icon="mentoring" alt="" />
                    <span>Mentoring</span>
                  </Link>
                </li>
              )}
              <li>
                <Link 
                  href="/contributing"
                  className="menu-link"
                  onClick={() => setIsOpen(false)}
                >
                  <Icon icon="contributing" alt="" />
                  <span>Contributing</span>
                </Link>
              </li>
            </ul>
          </nav>

          <hr className="divider" />

          <div className="menu-actions">
            <button
              className="sign-out-btn"
              onClick={() => {
                setIsOpen(false);
                signOut({ callbackUrl: '/' });
              }}
            >
              <Icon icon="sign-out" alt="" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}