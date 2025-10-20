"use client";

import { useRef, useEffect } from "react";
import Link from "next/link";
import { GraphicalIcon } from "@/components/common/GraphicalIcon";

interface NavigationItem {
  title: string;
  description?: string;
  path?: string;
  icon?: string;
  iconFilter?: string;
  external?: boolean;
  isNew?: boolean;
  view?: string;
}

interface GenericNavProps {
  navTitle: string;
  submenu?: NavigationItem[];
  view?: string;
  path?: string;
  offset?: number;
  hasView?: boolean;
  cssClass?: string;
}

export function GenericNav({
  navTitle,
  submenu,
  view,
  path,
  offset = 0,
  hasView = false,
  cssClass = "",
}: GenericNavProps) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      // Handle mouse leave
    }, 100);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <li
      className={`nav-element ${cssClass}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {path ? (
        <Link
          href={path}
          className="nav-element-link nav-element-focusable"
          tabIndex={0}
          role="none"
        >
          <span className="nav-element-label">{navTitle}</span>
        </Link>
      ) : (
        <span
          className="nav-element-label nav-element-focusable"
          tabIndex={0}
          role="none"
        >
          {navTitle}
        </span>
      )}

      {(submenu || view) && (
        <div
          className={`nav-element-dropdown ${
            hasView ? "has-view" : "has-no-view"
          }`}
          style={{ "--dropdown-offset": `-${offset}px` } as React.CSSProperties}
          role="menu"
        >
          {submenu && <NavDropdown submenu={submenu} hasView={hasView} />}
          {view && <NavDropdownView view={view} />}
        </div>
      )}

      {(submenu || view) && <CSSArrow />}
    </li>
  );
}

interface NavDropdownProps {
  submenu: NavigationItem[];
  hasView: boolean;
}

function NavDropdown({ submenu, hasView }: NavDropdownProps) {
  return (
    <ul>
      {submenu.map((element, index) => (
        <li key={index}>
          <ConditionalLink
            path={element.path || undefined}
            external={element.external || false}
          >
            <NavDropdownElement
              title={element.title}
              description={element.description || ""}
              icon={element.icon || ""}
              iconFilter={element.iconFilter || "none"}
              external={element.external || false}
              isNew={element.isNew || false}
            />
          </ConditionalLink>
          {hasView && element.view && <NavDropdownView view={element.view} />}
        </li>
      ))}
    </ul>
  );
}

interface ConditionalLinkProps {
  path: string | undefined;
  external: boolean;
  children: React.ReactNode;
}

function ConditionalLink({ path, external, children }: ConditionalLinkProps) {
  if (!path) {
    return <>{children}</>;
  }

  const linkProps = {
    tabIndex: 0,
    role: "none" as const,
    className: "nav-element-link nav-element-focusable",
    ...(external && { target: "_blank", rel: "noreferrer" }),
  };

  return (
    <Link href={path} {...linkProps}>
      {children}
    </Link>
  );
}

interface NavDropdownElementProps {
  title: string;
  description: string;
  icon: string;
  iconFilter: string;
  external: boolean;
  isNew: boolean;
}

function NavDropdownElement({
  title,
  description,
  icon,
  iconFilter,
  external,
  isNew,
}: NavDropdownElementProps) {
  return (
    <div className="nav-dropdown-element" role="menuitem">
      {icon && <GraphicalIcon icon={icon} className={`filter-${iconFilter}`} />}

      <div className="overflow-hidden pr-40">
        <h6>
          {title}
          {isNew && <span className="new">New</span>}
        </h6>
        {description && <p>{description}</p>}
      </div>

      {external && (
        <GraphicalIcon
          icon="external-link"
          alt="The link opens in a new window or tab"
          className="external-icon filter-textColor6"
        />
      )}
    </div>
  );
}

interface NavDropdownViewProps {
  view: string;
}

function NavDropdownView({ view }: NavDropdownViewProps) {
  return (
    <div className="nav-dropdown-view">
      <div className="nav-dropdown-view-content">
        {/* In real implementation, this would render the specific view template */}
        <div>View content for: {view}</div>
      </div>
    </div>
  );
}

function CSSArrow() {
  return <div className="arrow" />;
}

// Navigation submenu configurations (matching Ruby implementation)
export const LEARN_SUBMENU: NavigationItem[] = [
  {
    title: "Language Tracks",
    description: "Upskill in 65+ languages",
    path: "/tracks",
    icon: "nav-tracks",
    view: "tracks",
  },
  {
    title: "Structured Courses",
    description: "Guided learning paths",
    path: "/courses",
    icon: "nav-courses",
    isNew: true,
  },
  {
    title: "Coding Fundamentals",
    description: "The ultimate way to learn to code",
    path: "/bootcamp/coding-fundamentals",
    icon: "nav-coding-fundamentals",
    view: "coding_fundamentals",
  },
  {
    title: "Front-end Fundamentals",
    description: "Learn the basics of front-end development",
    path: "/bootcamp/front-end-fundamentals",
    icon: "nav-front-end-fundamentals",
    view: "front_end_fundamentals",
  },
  {
    title: "Your Journey",
    description: "Explore your Exercism journey",
    path: "/journey",
    icon: "nav-journey",
    view: "journey",
  },
  {
    title: "Your Favorites",
    description: "Revisit your favorite solutions",
    path: "/favorites",
    icon: "nav-favorites",
    view: "favorites",
    isNew: true,
  },
];

export const DISCOVER_SUBMENU: NavigationItem[] = [
  {
    title: "Community Hub",
    description: "Connect with fellow programmers",
    path: "/community",
    icon: "community",
    view: "community_hub",
  },
  {
    title: "Learning Cohorts",
    description: "Learn together with others",
    path: "/cohorts",
    icon: "mentoring",
    isNew: true,
  },
  {
    title: "Exercism Perks",
    description: "Offers & discounts from our partners",
    path: "/perks",
    icon: "perks-gradient",
  },
  {
    title: "Community Videos",
    description: "Streaming, walkthroughs & more",
    path: "/community/videos",
    icon: "external-site-youtube",
    view: "community_content",
  },
  {
    title: "Brief Introduction Series",
    description: "Short language overviews",
    path: "/community/brief-introductions",
    icon: "brief-introductions-gradient",
  },
  {
    title: "Interviews & Stories",
    description: "Get inspired by people's stories",
    path: "/community/interviews",
    icon: "interview-gradient",
  },
  {
    title: "Discord",
    description: "Chat & hang with the community",
    path: "/discord",
    icon: "external-site-discord-blue",
    view: "discord",
    external: true,
  },
  {
    title: "Forum",
    description: "Dig deeper into topics",
    path: "/forum",
    icon: "discourser",
    view: "forum",
    external: true,
  },
];

export const CONTRIBUTE_SUBMENU: NavigationItem[] = [
  {
    title: "Getting started",
    description: "How you can help Exercism",
    path: "/contributing",
    icon: "overview",
    iconFilter: "textColor6",
  },
  {
    title: "Mentoring",
    description: "Support others as they learn",
    path: "/mentoring",
    icon: "mentoring",
    iconFilter: "textColor6",
  },
  {
    title: "Docs",
    description: "Everything you need to help",
    path: "/docs",
    icon: "docs",
    iconFilter: "textColor6",
  },
  {
    title: "Contributors",
    description: "Meet the people behind Exercism",
    path: "/contributing/contributors",
    icon: "contributors",
    iconFilter: "textColor6",
  },
  {
    title: "Translators",
    description: "Support our Localization project",
    path: "/localization/translators/new",
    icon: "world",
    isNew: true,
    iconFilter: "textColor6",
  },
];

export const MORE_SUBMENU: NavigationItem[] = [
  {
    title: "Donate",
    description: "Help support our mission",
    path: "/donate",
    icon: "donate",
    iconFilter: "textColor6",
  },
  {
    title: "About Exercism",
    description: "Learn about our organisation",
    path: "/about",
    icon: "exercism-face",
    iconFilter: "textColor6",
  },
  {
    title: "Our Impact",
    description: "Explore what we've achieved",
    path: "/about/impact",
    icon: "report",
    iconFilter: "textColor6",
  },
  {
    title: "Partners",
    description: "Meet our amazing partners",
    path: "/partners",
    icon: "partners",
    iconFilter: "textColor6",
  },
  {
    title: "Bootcamp Animations",
    description: "Demo of bootcamp animations",
    path: "/bootcamp-animations-demo",
    icon: "overview",
    iconFilter: "textColor6",
    isNew: true,
  },
  {
    title: "GitHub Syncer",
    description: "Backup your solutions to GitHub",
    path: "/settings/github-syncer",
    icon: "feature-github-sync",
    iconFilter: "textColor6",
    isNew: true,
  },
  {
    title: "Insiders",
    description: "Our way of saying thank you",
    path: "/insiders",
    icon: "insiders",
  },
];
