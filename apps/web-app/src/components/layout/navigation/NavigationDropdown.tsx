'use client';

import React from 'react';

// Helper function to get appropriate icon text for placeholders
function getIconText(iconName: string): string {
  const iconMap: Record<string, string> = {
    'grid-2x2': '⊞',
    'message-square': '💬',
    'book-open': '📖',
    'users': '👥',
    'globe': '🌐',
    'ticket': '🎫',
    'youtube': '▶',
    'radio': '📻',
    'microphone': '🎤',
    'discord-logo': 'D',
    'message-circle': '💭',
    'network': '🔗',
    'code': '</>', 
    'monitor': '🖥',
    'rainbow': '🌈',
    'bookmark': '🔖',
    'palette': '🎨',
    'braces': '{}',
    'newspaper': '📰',
    'refresh-cw': '🔄',
    'heart': '💜'
  };
  
  return iconMap[iconName] || iconName.charAt(0).toUpperCase();
}

interface NavigationDropdownProps {
  isOpen: boolean;
  children: React.ReactNode;
  className?: string;
}

export function NavigationDropdown({ 
  isOpen, 
  children, 
  className = '' 
}: NavigationDropdownProps) {
  // Use CSS to hide instead of conditional rendering to avoid hydration issues
  return (
    <div 
      className={`navigation-dropdown ${className} ${isOpen ? 'visible' : 'hidden'}`}
      style={{ display: isOpen ? 'block' : 'none' }}
    >
      <div className="navigation-dropdown-content">
        {children}
      </div>
    </div>
  );
}

interface NavigationDropdownItemProps {
  icon: string;
  iconColor: string;
  title: string;
  subtitle: string;
  href: string;
  badge?: string;
  externalLink?: boolean;
  onClick?: () => void;
}

export function NavigationDropdownItem({
  icon,
  iconColor,
  title,
  subtitle,
  href,
  badge,
  externalLink,
  onClick
}: NavigationDropdownItemProps) {
  const handleClick = () => {
    onClick?.();
  };

  return (
    <a 
      href={href}
      className="navigation-dropdown-item"
      onClick={handleClick}
    >
      <div className="navigation-dropdown-item-icon">
        <div 
          className="icon-placeholder"
          style={{ 
            backgroundColor: iconColor === 'gradient-rainbow' 
              ? 'transparent' 
              : iconColor,
            background: iconColor === 'gradient-rainbow' 
              ? 'linear-gradient(45deg, #FF6B6B 0%, #4ECDC4 25%, #45B7D1 50%, #96CEB4 75%, #FFEAA7 100%)'
              : iconColor
          }}
          title={`${icon} icon`}
        >
          {/* Icon placeholder - will be replaced with actual icons */}
          <span className="icon-text">{getIconText(icon)}</span>
        </div>
      </div>
      
      <div className="navigation-dropdown-item-content">
        <div className="navigation-dropdown-item-title">
          {title}
          {badge && (
            <span className="navigation-dropdown-item-badge">
              {badge}
            </span>
          )}
        </div>
        <div className="navigation-dropdown-item-subtitle">
          {subtitle}
        </div>
      </div>
      
      {externalLink && (
        <div className="navigation-dropdown-item-external">
          <div className="external-link-icon">↗</div>
        </div>
      )}
    </a>
  );
}