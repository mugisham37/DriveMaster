import { useState, useEffect } from 'react';
import type { APIResponse } from '../types';

export const useNotificationDropdown = (data: APIResponse | undefined) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonId = 'notifications-button';
  const panelId = 'notifications-panel';
  const listId = 'notifications-list';

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  return {
    buttonAttributes: {
      id: buttonId,
      onClick: () => setIsOpen(!isOpen),
      'aria-expanded': isOpen,
      'aria-haspopup': 'menu' as const,
      'aria-controls': panelId
    },
    panelAttributes: {
      id: panelId,
      role: 'menu' as const,
      'aria-labelledby': buttonId
    },
    listAttributes: {
      role: 'menu',
      'aria-labelledby': buttonId,
      hidden: !isOpen
    },
    itemAttributes: (index: number) => ({
      role: 'menuitem',
      'aria-selected': false,
      onClick: () => setIsOpen(false)
    }),
    isOpen,
    setIsOpen
  };
};