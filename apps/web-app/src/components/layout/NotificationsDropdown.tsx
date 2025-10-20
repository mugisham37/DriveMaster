'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Icon } from '@/lib/assets';

interface Notification {
  id: string;
  type: string;
  text: string;
  url: string;
  isRead: boolean;
  createdAt: string;
}

export function NotificationsDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
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

  // TODO: Fetch notifications from API
  useEffect(() => {
    // This would be replaced with actual API call
    // fetchNotifications().then(setNotifications);
  }, []);

  return (
    <div className="notifications-dropdown" ref={dropdownRef}>
      <button
        className="notifications-trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Icon icon="notification" alt="Notifications" />
        {unreadCount > 0 && (
          <span className="notification-count">{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notifications-dropdown-content">
          <div className="notifications-header">
            <h3>Notifications</h3>
            <Link 
              href="/notifications" 
              className="view-all-link"
              onClick={() => setIsOpen(false)}
            >
              View all
            </Link>
          </div>

          <div className="notifications-list">
            {notifications.length === 0 ? (
              <div className="no-notifications">
                <Icon icon="notification-empty" alt="" />
                <p>No new notifications</p>
              </div>
            ) : (
              notifications.slice(0, 5).map((notification) => (
                <Link
                  key={notification.id}
                  href={notification.url}
                  className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
                  onClick={() => setIsOpen(false)}
                >
                  <div className="notification-content">
                    <p>{notification.text}</p>
                    <time className="notification-time">
                      {formatTime(notification.createdAt)}
                    </time>
                  </div>
                  {!notification.isRead && (
                    <div className="unread-indicator" />
                  )}
                </Link>
              ))
            )}
          </div>

          {notifications.length > 5 && (
            <div className="notifications-footer">
              <Link 
                href="/notifications" 
                className="view-all-btn"
                onClick={() => setIsOpen(false)}
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
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