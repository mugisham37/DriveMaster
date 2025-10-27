'use client';

import React from 'react';
import { NavigationDropdown, NavigationDropdownItem } from './NavigationDropdown';

interface ContributeDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ContributeDropdown({ isOpen, onClose }: ContributeDropdownProps) {
  const items = [
    {
      icon: 'grid-2x2',
      iconColor: '#1F2937',
      title: 'Getting started',
      subtitle: 'How you can help Exercism',
      href: '/contributing'
    },
    {
      icon: 'message-square',
      iconColor: '#1F2937',
      title: 'Mentoring',
      subtitle: 'Support others as they learn',
      href: '/mentoring'
    },
    {
      icon: 'book-open',
      iconColor: '#1F2937',
      title: 'Docs',
      subtitle: 'Everything you need to help',
      href: '/docs'
    },
    {
      icon: 'users',
      iconColor: '#1F2937',
      title: 'Contributors',
      subtitle: 'Meet the people behind Exercism',
      href: '/contributing/contributors'
    },
    {
      icon: 'globe',
      iconColor: '#6366F1',
      title: 'Translators',
      subtitle: 'Support our Localization project',
      href: '/contributing/translators',
      badge: 'NEW'
    }
  ];

  return (
    <NavigationDropdown isOpen={isOpen} className="contribute-dropdown">
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