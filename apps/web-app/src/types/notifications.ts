import { Ref } from 'react';

export interface NotificationStatus {
  isRead: boolean;
  updatedAt: string;
}

export interface NotificationLinks {
  self: string;
}

export interface Notification {
  id: string;
  type: string;
  status: NotificationStatus;
  links: NotificationLinks;
  content: string;
}

export interface NotificationsChannelData {
  type: 'notifications.changed' | 'notifications.deleted';
}

export interface NotificationsDropdownProps {
  endpoint: string;
}

export interface APIResponse {
  results: Notification[];
  meta: {
    total: number;
    unreadCount: number;
    links: {
      all: string;
    };
  };
}

export interface DropdownAttributes {
  buttonRef: React.RefObject<HTMLButtonElement>;
  buttonAttributes: {
    id: string;
    onClick: () => void;
    'aria-expanded': boolean;
    'aria-haspopup': 'menu';
  };
  panelAttributes: {
    id: string;
    role: 'menu';
    'aria-labelledby': string;
  };
  listAttributes: {
    id: string;
    role: 'menu';
    'aria-labelledby': string;
    hidden: boolean;
  };
  itemAttributes: (index: number) => {
    role: 'menuitem';
    'aria-selected': boolean;
    onClick: () => void;
  };
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
}