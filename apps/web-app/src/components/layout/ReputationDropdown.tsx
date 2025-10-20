'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/lib/assets';

interface ReputationToken {
  id: string;
  type: string;
  value: number;
  reason: string;
  createdAt: string;
  exercise?: {
    title: string;
    track: string;
  };
}

interface ReputationDropdownProps {
  user: {
    reputation?: string;
    handle?: string;
  };
}

export function ReputationDropdown({ user }: ReputationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reputationTokens, setReputationTokens] = useState<ReputationToken[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // TODO: Fetch reputation tokens from API
  useEffect(() => {
    if (isOpen) {
      // This would be replaced with actual API call
      // fetchReputationTokens().then(setReputationTokens);
    }
  }, [isOpen]);

  const reputation = user.reputation || '0';

  return (
    <div className="reputation-dropdown" ref={dropdownRef}>
      <button
        className="reputation-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Icon icon="reputation" alt="Reputation" />
        <span className="reputation-value">{reputation}</span>
        <Icon icon="chevron-down" alt="" />
      </button>

      {isOpen && (
        <div className="reputation-dropdown-content">
          <div className="reputation-header">
            <div className="reputation-summary">
              <Icon icon="reputation" alt="" />
              <div>
                <h3>Reputation</h3>
                <p className="total-reputation">{reputation} total</p>
              </div>
            </div>
            <Link 
              href={`/profiles/${user.handle}/reputation`}
              className="view-all-link"
              onClick={() => setIsOpen(false)}
            >
              View all
            </Link>
          </div>

          <div className="reputation-tokens">
            {reputationTokens.length === 0 ? (
              <div className="no-tokens">
                <Icon icon="reputation-empty" alt="" />
                <p>No recent reputation changes</p>
              </div>
            ) : (
              reputationTokens.slice(0, 5).map((token) => (
                <div key={token.id} className="reputation-token">
                  <div className="token-icon">
                    <Icon icon={getTokenIcon(token.type)} alt="" />
                  </div>
                  <div className="token-content">
                    <p className="token-reason">{token.reason}</p>
                    {token.exercise && (
                      <p className="token-exercise">
                        {token.exercise.title} in {token.exercise.track}
                      </p>
                    )}
                    <time className="token-time">
                      {formatTime(token.createdAt)}
                    </time>
                  </div>
                  <div className={`token-value ${token.value > 0 ? 'positive' : 'negative'}`}>
                    {token.value > 0 ? '+' : ''}{token.value}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="reputation-footer">
            <Link 
              href="/docs/using/product/reputation"
              className="learn-more-link"
              onClick={() => setIsOpen(false)}
            >
              Learn about reputation
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function getTokenIcon(type: string): string {
  switch (type) {
    case 'exercise_completion':
      return 'completed-check-circle';
    case 'solution_published':
      return 'publish';
    case 'mentoring_received':
      return 'mentoring';
    case 'mentoring_given':
      return 'mentoring';
    default:
      return 'reputation';
  }
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  return date.toLocaleDateString();
}