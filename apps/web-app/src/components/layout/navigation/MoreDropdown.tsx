'use client';

import React from 'react';
import { NavigationDropdown, NavigationDropdownItem } from './NavigationDropdown';

interface MoreDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MoreDropdown({ isOpen, onClose }: MoreDropdownProps) {
  const items = [
    {
      icon: 'palette',
      iconColor: '#8B5CF6',
      title: 'Donate',
      subtitle: 'Help support our mission',
      href: '/donate'
    },
    {
      icon: 'braces',
      iconColor: '#64748B',
      title: 'About Exercism',
      subtitle: 'Learn about our organisation',
      href: '/about'
    },
    {
      icon: 'newspaper',
      iconColor: '#64748B',
      title: 'Our Impact',
      subtitle: 'Explore what we\'ve achieved',
      href: '/about/impact'
    },
    {
      icon: 'refresh-cw',
      iconColor: '#6366F1',
      title: 'GitHub Syncer',
      subtitle: 'Backup your solutions to GitHub',
      href: '/settings/integrations',
      badge: 'NEW'
    },
    {
      icon: 'heart',
      iconColor: '#8B5CF6',
      title: 'Insiders',
      subtitle: 'Our way of saying thank you',
      href: '/insiders'
    }
  ];

  return (
    <NavigationDropdown isOpen={isOpen} className="more-dropdown">
      {items.map((item, index) => (
        <NavigationDropdownItem
          key={index}
          {...item}
          onClick={onClose}
        />
      ))}
    </NavigationDropdown>
  );
}