'use client';

import React from 'react';
import { NavigationDropdown, NavigationDropdownItem } from './NavigationDropdown';

interface LearnDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LearnDropdown({ isOpen, onClose }: LearnDropdownProps) {
  const items = [
    {
      icon: 'network',
      iconColor: '#64748B',
      title: 'Language Tracks',
      subtitle: 'Upskill in 65+ languages',
      href: '/tracks'
    },
    {
      icon: 'code',
      iconColor: '#64748B',
      title: 'Coding Fundamentals',
      subtitle: 'The ultimate way to learn to code',
      href: '/bootcamp/coding-fundamentals'
    },
    {
      icon: 'monitor',
      iconColor: '#64748B',
      title: 'Front-end Fundamentals',
      subtitle: 'Learn the basics of front-end development',
      href: '/bootcamp/frontend-fundamentals'
    },
    {
      icon: 'rainbow',
      iconColor: 'gradient-rainbow',
      title: 'Your Journey',
      subtitle: 'Explore your Exercism journey',
      href: '/journey'
    },
    {
      icon: 'bookmark',
      iconColor: '#F59E0B',
      title: 'Your Favorites',
      subtitle: 'Revisit your favorite solutions',
      href: '/favorites',
      badge: 'NEW'
    }
  ];

  return (
    <NavigationDropdown isOpen={isOpen} className="learn-dropdown">
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