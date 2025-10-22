'use client';

import { useState, useEffect } from 'react';
import { Icon } from '@/lib/assets';

type Theme = 'light' | 'dark' | 'system';

export function DisabledThemeSelectorTooltip({ insidersLink }: { insidersLink: string }) {
  return (
    <div className="disabled-theme-tooltip p-3 max-w-xs">
      <p className="text-sm mb-2">
        <strong>Dark theme is an Insider feature</strong>
      </p>
      <p className="text-xs text-textColor6 mb-3">
        Become an Insider to unlock dark theme and other exclusive features.
      </p>
      <a
        href={insidersLink}
        className="btn-primary btn-xs"
        target="_blank"
        rel="noopener noreferrer"
      >
        Learn about Insiders
      </a>
    </div>
  )
}

export function ThemeToggleButton() {
  const [theme, setTheme] = useState<Theme>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setTheme(savedTheme as Theme);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      // System theme
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      if (mediaQuery.matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }

    localStorage.setItem('theme', theme);
  }, [theme, mounted]);

  const toggleTheme = () => {
    const themes: Theme[] = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    const nextTheme = themes[nextIndex];
    if (nextTheme) {
      setTheme(nextTheme);
    }
  };

  if (!mounted) {
    return null;
  }

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return 'sun';
      case 'dark':
        return 'moon';
      case 'system':
        return 'monitor';
      default:
        return 'monitor';
    }
  };

  const getThemeLabel = () => {
    switch (theme) {
      case 'light':
        return 'Light theme';
      case 'dark':
        return 'Dark theme';
      case 'system':
        return 'System theme';
      default:
        return 'System theme';
    }
  };

  return (
    <button
      className="theme-toggle-button"
      onClick={toggleTheme}
      aria-label={`Switch to next theme (current: ${theme})`}
      title={getThemeLabel()}
    >
      <Icon icon={getThemeIcon()} alt="" />
    </button>
  );
}
