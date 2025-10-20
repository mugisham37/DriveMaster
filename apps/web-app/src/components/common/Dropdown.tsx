'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';

interface DropdownProps {
  menuButton: ReactNode;
  menuItems: ReactNode;
  persistent?: boolean;
  className?: string;
  disabled?: boolean;
}

export function Dropdown({ 
  menuButton, 
  menuItems, 
  persistent = true, 
  className = '',
  disabled = false 
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!persistent) return;

    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen, persistent]);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <div 
      className={`dropdown ${className} ${disabled ? 'disabled' : ''}`} 
      ref={dropdownRef}
    >
      <div 
        onClick={handleToggle}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleToggle();
          }
        }}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-disabled={disabled}
      >
        {menuButton}
      </div>

      {isOpen && (
        <div className="dropdown-content" onClick={handleClose}>
          {menuItems}
        </div>
      )}
    </div>
  );
}