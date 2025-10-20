'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/lib/assets';

interface DocsMainNavProps {
  selectedSection?: string;
}

export function DocsMainNav({ selectedSection }: DocsMainNavProps) {
  const pathname = usePathname();

  const getSelectedSection = () => {
    if (selectedSection) return selectedSection;
    
    // Auto-detect from pathname
    if (pathname === '/docs') return null;
    if (pathname.startsWith('/docs/using')) return 'using';
    if (pathname.startsWith('/docs/building')) return 'building';
    if (pathname.startsWith('/docs/mentoring')) return 'mentoring';
    if (pathname.startsWith('/docs/community')) return 'community';
    if (pathname.startsWith('/docs/tracks')) return 'tracks';
    
    return null;
  };

  const currentSection = getSelectedSection();

  const navItems = [
    { title: 'Using Exercism', path: '/docs/using', section: 'using' },
    { title: 'Building Exercism', path: '/docs/building', section: 'building' },
    { title: 'Mentoring', path: '/docs/mentoring', section: 'mentoring' },
    { title: 'Community', path: '/docs/community', section: 'community' },
    { title: 'Track-specific', path: '/docs/tracks', section: 'tracks' },
  ];

  return (
    <div className="c-docs-nav">
      <div className="lg-container container">
        <nav className="lhs">
          <ul className="scroll-x-hidden" data-scrollable-container="true">
            {/* Docs Home */}
            <li
              className={!currentSection ? 'selected' : undefined}
              data-scroll-into-view={!currentSection ? 'x' : undefined}
            >
              <Link href="/docs">
                <Icon icon="home" alt="Docs home" />
              </Link>
            </li>

            {/* Navigation Items */}
            {navItems.map((item) => (
              <li
                key={item.section}
                className={currentSection === item.section ? 'selected' : undefined}
                data-scroll-into-view={currentSection === item.section ? 'x' : undefined}
              >
                <Link href={item.path}>
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Right side navigation (future implementation) */}
        <nav className="rhs" style={{ display: 'none' }}>
          <ul>
            <li className="api">
              <Link href="/api">🎉 Exercism API</Link>
            </li>
            <li>
              <Link href="/support">Support</Link>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}