'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type SettingsSection = 
  | 'general'
  | 'api_cli'
  | 'integrations'
  | 'github_syncer'
  | 'preferences'
  | 'communication'
  | 'donations'
  | 'insiders';

interface SettingsNavProps {
  selected?: SettingsSection;
}

interface NavItem {
  text: string;
  route: string;
  key: SettingsSection;
}

const NAV_ITEMS: NavItem[] = [
  { text: 'Account settings', route: '/settings', key: 'general' },
  { text: 'API / CLI', route: '/settings/api-cli', key: 'api_cli' },
  { text: 'Integrations', route: '/settings/integrations', key: 'integrations' },
  { text: 'GitHub Syncer', route: '/settings/github-syncer', key: 'github_syncer' },
  { text: 'Preferences', route: '/settings/preferences', key: 'preferences' },
  { text: 'Communication Preferences', route: '/settings/communication', key: 'communication' },
  { text: 'Donations', route: '/settings/donations', key: 'donations' },
  { text: 'Insiders', route: '/settings/insiders', key: 'insiders' },
];

export function SettingsNav({ selected }: SettingsNavProps) {
  const pathname = usePathname();

  const getSelectedSection = (): SettingsSection => {
    if (selected) return selected;
    
    // Auto-detect from pathname
    if (pathname === '/settings') return 'general';
    if (pathname === '/settings/api-cli') return 'api_cli';
    if (pathname === '/settings/integrations') return 'integrations';
    if (pathname === '/settings/github-syncer') return 'github_syncer';
    if (pathname === '/settings/preferences') return 'preferences';
    if (pathname === '/settings/communication') return 'communication';
    if (pathname === '/settings/donations') return 'donations';
    if (pathname === '/settings/insiders') return 'insiders';
    
    return 'general';
  };

  const currentSection = getSelectedSection();

  const renderNavItem = (item: NavItem) => {
    const isSelected = item.key === currentSection;
    
    return (
      <li key={item.key}>
        {isSelected ? (
          <div className="selected">{item.text}</div>
        ) : (
          <Link href={item.route}>{item.text}</Link>
        )}
      </li>
    );
  };

  return (
    <nav className="settings-nav">
      <ul>
        {NAV_ITEMS.map(renderNavItem)}
      </ul>
    </nav>
  );
}