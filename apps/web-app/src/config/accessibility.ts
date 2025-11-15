/**
 * Accessibility Configuration
 * 
 * Central configuration for accessibility features and settings.
 * 
 * Requirements: 10.1-10.14
 * Task: 13.1, 13.2, 13.3
 */

// ============================================================================
// WCAG Compliance Levels
// ============================================================================

export const WCAG_LEVELS = {
  A: 'A',
  AA: 'AA',
  AAA: 'AAA',
} as const;

export type WCAGLevel = typeof WCAG_LEVELS[keyof typeof WCAG_LEVELS];

// Target compliance level for this application
export const TARGET_WCAG_LEVEL: WCAGLevel = WCAG_LEVELS.AA;

// ============================================================================
// Contrast Ratios
// ============================================================================

export const CONTRAST_RATIOS = {
  // WCAG AA requirements
  AA_NORMAL_TEXT: 4.5,
  AA_LARGE_TEXT: 3.0,
  AA_UI_COMPONENTS: 3.0,

  // WCAG AAA requirements
  AAA_NORMAL_TEXT: 7.0,
  AAA_LARGE_TEXT: 4.5,
} as const;

// Large text is defined as 18pt (24px) or 14pt (18.66px) bold
export const LARGE_TEXT_SIZE_PX = 24;
export const LARGE_TEXT_BOLD_SIZE_PX = 18.66;

// ============================================================================
// Touch Target Sizes
// ============================================================================

export const TOUCH_TARGET = {
  // WCAG 2.1 Level AAA requirement
  MIN_SIZE_PX: 44,

  // Recommended size for better usability
  RECOMMENDED_SIZE_PX: 48,

  // Minimum spacing between targets
  MIN_SPACING_PX: 8,
} as const;

// ============================================================================
// Focus Indicators
// ============================================================================

export const FOCUS_INDICATOR = {
  // Minimum thickness for focus indicators
  MIN_THICKNESS_PX: 2,

  // Recommended thickness
  RECOMMENDED_THICKNESS_PX: 3,

  // Minimum offset from element
  MIN_OFFSET_PX: 2,

  // Focus indicator color (should meet 3:1 contrast)
  COLOR: 'hsl(var(--primary))',

  // Focus indicator style
  STYLE: 'solid' as const,
} as const;

// ============================================================================
// Animation and Motion
// ============================================================================

export const ANIMATION = {
  // Default animation duration (ms)
  DEFAULT_DURATION_MS: 300,

  // Reduced motion duration (ms)
  REDUCED_MOTION_DURATION_MS: 0,

  // Maximum animation duration before requiring user control
  MAX_AUTO_DURATION_MS: 5000,

  // Parallax and vestibular motion should be optional
  ALLOW_PARALLAX: false,
  ALLOW_VESTIBULAR_MOTION: false,
} as const;

// ============================================================================
// Text and Typography
// ============================================================================

export const TYPOGRAPHY = {
  // Minimum font size (px)
  MIN_FONT_SIZE_PX: 14,

  // Maximum line length (characters)
  MAX_LINE_LENGTH_CHARS: 80,

  // Minimum line height
  MIN_LINE_HEIGHT: 1.5,

  // Minimum paragraph spacing
  MIN_PARAGRAPH_SPACING: 1.5,

  // Text resize support (percentage)
  MAX_TEXT_RESIZE_PERCENT: 200,
} as const;

// ============================================================================
// Keyboard Navigation
// ============================================================================

export const KEYBOARD = {
  // Keys for activation
  ACTIVATION_KEYS: ['Enter', ' '] as const,

  // Keys for dismissal
  DISMISSAL_KEYS: ['Escape'] as const,

  // Arrow keys for navigation
  NAVIGATION_KEYS: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'] as const,

  // Home/End keys
  BOUNDARY_KEYS: ['Home', 'End'] as const,

  // Tab key
  TAB_KEY: 'Tab' as const,

  // Modifier keys
  MODIFIER_KEYS: ['Shift', 'Control', 'Alt', 'Meta'] as const,
} as const;

// ============================================================================
// Screen Reader
// ============================================================================

export const SCREEN_READER = {
  // Announcement debounce (ms)
  ANNOUNCEMENT_DEBOUNCE_MS: 100,

  // Announcement priorities
  PRIORITY_POLITE: 'polite' as const,
  PRIORITY_ASSERTIVE: 'assertive' as const,

  // Common ARIA roles
  ROLES: {
    ALERT: 'alert',
    STATUS: 'status',
    LOG: 'log',
    TIMER: 'timer',
    MARQUEE: 'marquee',
    PROGRESSBAR: 'progressbar',
    DIALOG: 'dialog',
    ALERTDIALOG: 'alertdialog',
    MENU: 'menu',
    MENUBAR: 'menubar',
    MENUITEM: 'menuitem',
    TAB: 'tab',
    TABLIST: 'tablist',
    TABPANEL: 'tabpanel',
    BUTTON: 'button',
    LINK: 'link',
    NAVIGATION: 'navigation',
    MAIN: 'main',
    COMPLEMENTARY: 'complementary',
    CONTENTINFO: 'contentinfo',
    BANNER: 'banner',
    SEARCH: 'search',
    FORM: 'form',
    REGION: 'region',
  } as const,
} as const;

// ============================================================================
// Timeout and Timing
// ============================================================================

export const TIMING = {
  // Minimum time for reading alerts (ms)
  MIN_ALERT_DURATION_MS: 3000,

  // Session timeout warning (ms before timeout)
  SESSION_TIMEOUT_WARNING_MS: 120000, // 2 minutes

  // Auto-save debounce (ms)
  AUTO_SAVE_DEBOUNCE_MS: 2000,

  // Search debounce (ms)
  SEARCH_DEBOUNCE_MS: 300,

  // Scroll throttle (ms)
  SCROLL_THROTTLE_MS: 100,

  // Resize throttle (ms)
  RESIZE_THROTTLE_MS: 100,
} as const;

// ============================================================================
// Skip Navigation
// ============================================================================

export const SKIP_NAVIGATION = {
  // Default skip links
  DEFAULT_LINKS: [
    {
      id: 'skip-to-main',
      label: 'Skip to main content',
      targetId: 'main-content',
    },
    {
      id: 'skip-to-nav',
      label: 'Skip to navigation',
      targetId: 'main-navigation',
    },
    {
      id: 'skip-to-footer',
      label: 'Skip to footer',
      targetId: 'footer',
    },
  ] as const,
} as const;

// ============================================================================
// Form Accessibility
// ============================================================================

export const FORM = {
  // Error message display duration (ms)
  ERROR_DISPLAY_DURATION_MS: 5000,

  // Validation debounce (ms)
  VALIDATION_DEBOUNCE_MS: 300,

  // Required field indicator
  REQUIRED_INDICATOR: '*',

  // Error icon
  ERROR_ICON: '⚠️',

  // Success icon
  SUCCESS_ICON: '✓',
} as const;

// ============================================================================
// Color and Contrast
// ============================================================================

export const COLOR = {
  // Don't use color alone to convey information
  USE_COLOR_ALONE: false,

  // Provide text alternatives for color-coded information
  REQUIRE_TEXT_ALTERNATIVES: true,

  // Support for color blindness
  SUPPORT_COLOR_BLIND_MODES: true,

  // Color blind friendly palette
  COLOR_BLIND_SAFE_COLORS: {
    BLUE: '#0173B2',
    ORANGE: '#DE8F05',
    GREEN: '#029E73',
    RED: '#CC78BC',
    PURPLE: '#CA9161',
    BROWN: '#949494',
  } as const,
} as const;

// ============================================================================
// Heading Hierarchy
// ============================================================================

export const HEADING = {
  // Enforce proper heading hierarchy
  ENFORCE_HIERARCHY: true,

  // Maximum heading level
  MAX_LEVEL: 6,

  // Warn on skipped levels in development
  WARN_ON_SKIP: typeof process !== 'undefined' && process.env?.NODE_ENV === 'development',
} as const;

// ============================================================================
// Landmark Regions
// ============================================================================

export const LANDMARKS = {
  // Required landmark regions
  REQUIRED: ['banner', 'main', 'contentinfo'] as const,

  // Recommended landmark regions
  RECOMMENDED: ['navigation', 'search', 'complementary'] as const,

  // Each page should have exactly one main landmark
  SINGLE_MAIN: true,

  // Each page should have exactly one banner landmark
  SINGLE_BANNER: true,

  // Each page should have exactly one contentinfo landmark
  SINGLE_CONTENTINFO: true,
} as const;

// ============================================================================
// Language and Localization
// ============================================================================

export const LANGUAGE = {
  // Default language
  DEFAULT: 'en',

  // Supported languages
  SUPPORTED: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'zh', 'ko'] as const,

  // Require lang attribute on html element
  REQUIRE_LANG_ATTRIBUTE: true,

  // Announce language changes
  ANNOUNCE_LANGUAGE_CHANGES: true,
} as const;

// ============================================================================
// Testing and Validation
// ============================================================================

export const TESTING = {
  // Run accessibility tests in development
  RUN_IN_DEVELOPMENT: typeof process !== 'undefined' && process.env?.NODE_ENV === 'development',

  // Accessibility testing tools
  TOOLS: {
    AXE_CORE: true,
    LIGHTHOUSE: true,
    WAVE: false,
  } as const,

  // Fail on accessibility violations
  FAIL_ON_VIOLATIONS: typeof process !== 'undefined' && process.env?.NODE_ENV === 'production',

  // Violation severity levels to report
  REPORT_LEVELS: ['critical', 'serious', 'moderate'] as const,
} as const;

// ============================================================================
// Feature Flags
// ============================================================================

export const FEATURES = {
  // Enable skip navigation
  SKIP_NAVIGATION: true,

  // Enable focus visible management
  FOCUS_VISIBLE: true,

  // Enable keyboard shortcuts
  KEYBOARD_SHORTCUTS: true,

  // Enable screen reader announcements
  SCREEN_READER_ANNOUNCEMENTS: true,

  // Enable high contrast mode
  HIGH_CONTRAST_MODE: true,

  // Enable reduced motion mode
  REDUCED_MOTION_MODE: true,

  // Enable text resizing
  TEXT_RESIZING: true,

  // Enable heading hierarchy validation
  HEADING_HIERARCHY_VALIDATION: typeof process !== 'undefined' && process.env?.NODE_ENV === 'development',
} as const;

// ============================================================================
// Export All
// ============================================================================

export const ACCESSIBILITY_CONFIG = {
  WCAG_LEVELS,
  TARGET_WCAG_LEVEL,
  CONTRAST_RATIOS,
  LARGE_TEXT_SIZE_PX,
  LARGE_TEXT_BOLD_SIZE_PX,
  TOUCH_TARGET,
  FOCUS_INDICATOR,
  ANIMATION,
  TYPOGRAPHY,
  KEYBOARD,
  SCREEN_READER,
  TIMING,
  SKIP_NAVIGATION,
  FORM,
  COLOR,
  HEADING,
  LANDMARKS,
  LANGUAGE,
  TESTING,
  FEATURES,
} as const;

export default ACCESSIBILITY_CONFIG;
