export interface NotificationStatus {
  isRead: boolean;
  updatedAt: string;
}

export interface NotificationLinks {
  self: string;
  view: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  content: string;
  status: NotificationStatus;
  links: NotificationLinks;
  timestamp: string;
}

export interface NotificationsChannelData {
  type: 'notifications.changed';
  payload: {
    id: string;
    status: string;
  };
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
    role: string;
    'aria-labelledby': string;
    hidden: boolean;
  };
  itemAttributes: (index: number) => {
    role: string;
    'aria-selected': boolean;
    onClick: () => void;
  };
  isOpen: boolean;
  setIsOpen: (value: boolean) => void;
}

export interface NotificationsDropdownProps {
  endpoint: string;
}