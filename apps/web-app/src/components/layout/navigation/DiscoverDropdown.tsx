'use client';

import React from 'react';
import { NavigationDropdown, NavigationDropdownItem } from './NavigationDropdown';

interface DiscoverDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DiscoverDropdown({ isOpen, onClose }: DiscoverDropdownProps) {
  const items = [
    {
      icon: 'ticket',
      iconColor: '#8B5CF6',
      title: 'Exercism Perks',
      subtitle: 'Offers & discounts from our partners',
      href: '/perks'
    },
    {
      icon: 'youtube',
      iconColor: '#FF0000',
      title: 'Community Videos',
      subtitle: 'Streaming, walkthroughs & more',
      href: '/community/videos'
    },
    {
      icon: 'radio',
      iconColor: '#A855F7',
      title: 'Brief Introduction Series',
      subtitle: 'Short language overviews',
      href: '/community/brief-introductions'
    },
    {
      icon: 'microphone',
      iconColor: '#8B5CF6',
      title: 'Interviews & Stories',
      subtitle: 'Get inspired by people\'s stories',
      href: '/community/interviews'
    },
    {
      icon: 'discord-logo',
      iconColor: '#5865F2',
      title: 'Discord',
      subtitle: 'Chat & hang with the community',
      href: 'https://discord.gg/exercism',
      externalLink: true
    },
    {
      icon: 'message-circle',
      iconColor: '#F59E0B',
      title: 'Forum',
      subtitle: 'Dig deeper into topics',
      href: 'https://forum.exercism.org',
      externalLink: true
    }
  ];

  return (
    <NavigationDropdown isOpen={isOpen} className="discover-dropdown">
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