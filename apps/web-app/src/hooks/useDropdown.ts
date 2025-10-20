import { useState, useRef, useEffect, useCallback } from 'react';

interface UseDropdownOptions {
  persistent?: boolean;
  disabled?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

interface UseDropdownReturn {
  isOpen: boolean;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  toggle: () => void;
  open: () => void;
  close: () => void;
  handleKeyDown: (event: React.KeyboardEvent) => void;
}

export function useDropdown({
  persistent = true,
  disabled = false,
  onOpen,
  onClose
}: UseDropdownOptions = {}): UseDropdownReturn {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const open = useCallback(() => {
    if (!disabled) {
      setIsOpen(true);
      onOpen?.();
    }
  }, [disabled, onOpen]);

  const close = useCallback(() => {
    setIsOpen(false);
    onClose?.();
  }, [onClose]);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggle();
    } else if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      close();
    }
  }, [toggle, close, isOpen]);

  useEffect(() => {
    if (!persistent || !isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        close();
      }
    }

    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        close();
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, persistent, close]);

  return {
    isOpen,
    dropdownRef,
    toggle,
    open,
    close,
    handleKeyDown
  };
}