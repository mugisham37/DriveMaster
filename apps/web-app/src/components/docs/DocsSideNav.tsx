'use client';

import Link from 'next/link';
import { useState } from 'react';

interface Doc {
  slug: string;
  title: string;
  navTitle: string;
  section: string;
  track?: {
    slug: string;
    title: string;
  };
  apex?: boolean;
}

interface Track {
  slug: string;
  title: string;
}

interface DocsSideNavProps {
  docs: Doc[];
  selectedDoc?: Doc;
  track?: Track;
}

interface StructuredDocs {
  [key: string]: StructuredDocs | Record<string, never>;
}

export function DocsSideNav({ docs, selectedDoc, track }: DocsSideNavProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Build structured docs hierarchy
  const buildStructuredDocs = (): StructuredDocs => {
    const levels: string[] = [];
    let current = '';
    
    if (selectedDoc?.slug) {
      selectedDoc.slug.split('/').forEach((part) => {
        current += `${part}/`;
        levels.push(current);
      });
    }

    const paths = docs.map(doc => doc.slug);
    const tree: StructuredDocs = {};

    paths.forEach((path) => {
      const level = path.split('/').length - 1;
      
      // Only include docs that are:
      // - top level
      // - at a level below this in its path
      // - parallel to it; or
      // - a direct-child of the current doc
      if (level === 0 || (levels.length >= level && path.startsWith(levels[level - 1] || ''))) {
        const parts = path.split('/');
        let currentLevel = tree;
        
        parts.forEach((_, i) => {
          const node = parts.slice(0, i + 1).join('/');
          if (!currentLevel[node]) {
            currentLevel[node] = {};
          }
          currentLevel = currentLevel[node] as StructuredDocs;
        });
      }
    });

    return tree;
  };

  const structuredDocs = buildStructuredDocs();

  // Get docs that have children
  const getDocsWithChildren = (): string[] => {
    const paths = docs.map(doc => doc.slug);
    return paths.filter(path => 
      paths.some(otherPath => otherPath !== path && otherPath.startsWith(`${path}/`))
    );
  };

  const docsWithChildren = getDocsWithChildren();

  // Flatten hash for checking expanded state
  const flattenHash = (hash: StructuredDocs): string[] => {
    const result: string[] = [];
    Object.keys(hash).forEach(key => {
      if (key) result.push(key);
      const values = hash[key];
      if (values && typeof values === 'object') {
        result.push(...flattenHash(values as StructuredDocs));
      }
    });
    return result;
  };

  // Render a section of the navigation
  const renderSection = (node: string | null, children: StructuredDocs): React.ReactNode[] => {
    if (!node && !Object.keys(children).length) return [];

    const tags: React.ReactNode[] = [];
    
    if (node) {
      tags.push(renderDocLi(node, children));
    }

    if (Object.keys(children).length > 0) {
      tags.push(
        <li key={`${node}-children`}>
          <ul>
            {Object.entries(children).map(([childNode, grandchildren]) =>
              renderSection(childNode, grandchildren as StructuredDocs)
            )}
          </ul>
        </li>
      );
    }

    return tags;
  };

  // Render a single doc list item
  const renderDocLi = (slug: string, children: StructuredDocs) => {
    if (!slug) return null;

    const doc = docs.find(d => d.slug === slug);
    if (!doc) return null;

    let url: string;
    if (doc.track) {
      url = `/tracks/${doc.track.slug}/docs/${doc.slug}`;
    } else if (doc.apex) {
      url = `/docs/${doc.section}`;
    } else {
      url = `/docs/${doc.section}/${doc.slug}`;
    }

    const cssClasses: string[] = [];
    const isSelected = doc.slug === selectedDoc?.slug;
    
    if (isSelected) {
      cssClasses.push('selected', 'expanded');
    }
    
    if (docsWithChildren.includes(doc.slug)) {
      cssClasses.push('header');
    }
    
    if (flattenHash(children).some(c => c === selectedDoc?.slug)) {
      cssClasses.push('expanded');
    }

    return (
      <li
        key={slug}
        className={cssClasses.join(' ')}
        data-scroll-into-view={isSelected ? 'y' : undefined}
      >
        <Link href={url}>
          <span>{doc.navTitle}</span>
        </Link>
      </li>
    );
  };

  return (
    <nav className="c-docs-side-nav">
      {track && <h2>{track.title}</h2>}
      
      <input
        className="side-menu-trigger"
        id="side-menu-trigger"
        type="checkbox"
        style={{ display: 'none' }}
        checked={isMenuOpen}
        onChange={(e) => setIsMenuOpen(e.target.checked)}
      />
      
      <label htmlFor="side-menu-trigger" className="trigger-label">
        <span className="icon-bar top-bar" />
        <span className="icon-bar middle-bar" />
        <span className="icon-bar bottom-bar" />
      </label>
      
      <ul className="c-docs-side-nav-ul" data-scrollable-container="true">
        {Object.entries(structuredDocs).map(([node, children]) =>
          renderSection(node, children as StructuredDocs)
        )}
      </ul>
    </nav>
  );
}