'use client';

import Link from 'next/link';
import { GraphicalIcon } from '@/lib/assets';
import { useDropdown } from '@/hooks/useDropdown';

interface ExploreItem {
  title: string;
  href: string;
  className?: string;
}

const EXPLORE_ITEMS: ExploreItem[] = [
  { title: 'Home', href: '/', className: 'opt site-link' },
  { title: 'Language Tracks', href: '/tracks', className: 'opt site-link' },
  { title: 'Community', href: '/community', className: 'opt site-link' },
  { title: 'Mentoring', href: '/mentoring', className: 'opt site-link' },
  { title: 'Insiders 💜', href: '/insiders', className: 'opt site-link' },
  { title: 'Donate', href: '/donate', className: 'opt site-link donate' },
];

export function ExploreDropdown() {
  const { isOpen, dropdownRef, toggle, close, handleKeyDown } = useDropdown();

  return (
    <div className="explore-dropdown" ref={dropdownRef}>
      <button
        className="explore-menu btn-xs btn-enhanced"
        onClick={toggle}
        onKeyDown={handleKeyDown}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Button to open the navigation menu"
      >
        <GraphicalIcon icon="hamburger" />
        <span>Explore</span>
      </button>

      {isOpen && (
        <div className="explore-dropdown-content">
          <nav className="explore-nav">
            <ul>
              {EXPLORE_ITEMS.map((item) => (
                <li key={item.href} className={item.className}>
                  <Link 
                    href={item.href}
                    data-turbo-frame="tf-main"
                    onClick={close}
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      )}
    </div>
  );
}