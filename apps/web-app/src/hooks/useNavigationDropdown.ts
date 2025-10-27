import { useState, useRef, useCallback } from 'react';

interface UseNavigationDropdownOptions {
  hoverDelay?: number;
  leaveDelay?: number;
}

interface UseNavigationDropdownReturn {
  isOpen: boolean;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  handleMouseEnter: () => void;
  handleMouseLeave: () => void;
  close: () => void;
}

export function useNavigationDropdown({
  hoverDelay = 150,
  leaveDelay = 300
}: UseNavigationDropdownOptions = {}): UseNavigationDropdownReturn {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const enterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimeouts = useCallback(() => {
    if (enterTimeoutRef.current) {
      clearTimeout(enterTimeoutRef.current);
      enterTimeoutRef.current = null;
    }
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    clearTimeouts();
    
    enterTimeoutRef.current = setTimeout(() => {
      setIsOpen(true);
    }, hoverDelay);
  }, [hoverDelay, clearTimeouts]);

  const handleMouseLeave = useCallback(() => {
    clearTimeouts();
    
    leaveTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
    }, leaveDelay);
  }, [leaveDelay, clearTimeouts]);

  const close = useCallback(() => {
    clearTimeouts();
    setIsOpen(false);
  }, [clearTimeouts]);

  return {
    isOpen,
    dropdownRef,
    handleMouseEnter,
    handleMouseLeave,
    close
  };
}