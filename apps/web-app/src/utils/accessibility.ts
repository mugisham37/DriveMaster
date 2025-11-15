/**
 * Accessibility Utilities
 * 
 * Helper functions and constants for implementing WCAG 2.1 AA compliance.
 * 
 * Requirements: 10.1-10.14
 * Task: 13.1, 13.2, 13.3
 */

// ============================================================================
// Keyboard Navigation Constants
// ============================================================================

export const KEYBOARD_KEYS = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',
} as const;

// ============================================================================
// Focus Management
// ============================================================================

/**
 * Trap focus within a container element (for modals, dialogs)
 */
export function trapFocus(container: HTMLElement, event: KeyboardEvent) {
  if (event.key !== KEYBOARD_KEYS.TAB) return;

  const focusableElements = getFocusableElements(container);
  if (focusableElements.length === 0) return;

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  if (!firstElement || !lastElement) return;

  if (event.shiftKey) {
    // Shift + Tab
    if (document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    }
  } else {
    // Tab
    if (document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }
}

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
    (element) => {
      return (
        element.offsetWidth > 0 &&
        element.offsetHeight > 0 &&
        !element.hasAttribute('hidden')
      );
    }
  );
}

/**
 * Restore focus to a previously focused element
 */
export function restoreFocus(element: HTMLElement | null) {
  if (!element || typeof element.focus !== 'function') return;
  
  // Use setTimeout to ensure DOM is ready
  setTimeout(() => {
    if (element && typeof element.focus === 'function') {
      element.focus();
    }
  }, 0);
}

/**
 * Move focus to the first focusable element in a container
 */
export function focusFirstElement(container: HTMLElement) {
  const focusableElements = getFocusableElements(container);
  if (focusableElements.length > 0) {
    focusableElements[0].focus();
  }
}

// ============================================================================
// ARIA Announcements
// ============================================================================

/**
 * Announce a message to screen readers using ARIA live region
 */
export function announceToScreenReader(
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
) {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
}

// ============================================================================
// Keyboard Event Handlers
// ============================================================================

/**
 * Handle keyboard activation (Enter or Space) for custom interactive elements
 */
export function handleKeyboardActivation(
  event: KeyboardEvent,
  callback: () => void
) {
  if (event.key === KEYBOARD_KEYS.ENTER || event.key === KEYBOARD_KEYS.SPACE) {
    event.preventDefault();
    callback();
  }
}

/**
 * Handle Escape key to close modals/dropdowns
 */
export function handleEscapeKey(
  event: KeyboardEvent,
  callback: () => void
) {
  if (event.key === KEYBOARD_KEYS.ESCAPE) {
    event.preventDefault();
    callback();
  }
}

// ============================================================================
// Skip Navigation
// ============================================================================

/**
 * Generate skip navigation link ID
 */
export function getSkipLinkId(target: string): string {
  return `skip-to-${target}`;
}

/**
 * Scroll to and focus a skip navigation target
 */
export function skipToContent(targetId: string) {
  const target = document.getElementById(targetId);
  if (target) {
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    target.focus();
  }
}

// ============================================================================
// Contrast and Color Utilities
// ============================================================================

/**
 * Calculate relative luminance for contrast ratio
 * Based on WCAG 2.1 formula
 */
function getRelativeLuminance(rgb: [number, number, number]): number {
  const [r = 0, g = 0, b = 0] = rgb.map((val) => {
    const sRGB = val / 255;
    return sRGB <= 0.03928
      ? sRGB / 12.92
      : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculate contrast ratio between two colors
 * Returns a value between 1 and 21
 */
export function getContrastRatio(
  color1: [number, number, number],
  color2: [number, number, number]
): number {
  const lum1 = getRelativeLuminance(color1);
  const lum2 = getRelativeLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG AA standards
 */
export function meetsContrastRequirement(
  ratio: number,
  level: 'AA' | 'AAA' = 'AA',
  isLargeText: boolean = false
): boolean {
  if (level === 'AAA') {
    return isLargeText ? ratio >= 4.5 : ratio >= 7;
  }
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

// ============================================================================
// Reduced Motion
// ============================================================================

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get animation duration based on user preference
 */
export function getAnimationDuration(defaultMs: number): number {
  return prefersReducedMotion() ? 0 : defaultMs;
}

// ============================================================================
// Screen Reader Only Styles
// ============================================================================

/**
 * CSS class for screen reader only content
 * Use this for visually hidden but accessible content
 */
export const SR_ONLY_CLASS =
  'absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0';

// ============================================================================
// ARIA Label Generators
// ============================================================================

/**
 * Generate descriptive label for progress indicators
 */
export function getProgressLabel(value: number, total: number, unit: string): string {
  const percentage = Math.round((value / total) * 100);
  return `${value} of ${total} ${unit} complete, ${percentage} percent`;
}

/**
 * Generate descriptive label for status indicators
 */
export function getStatusLabel(status: string, context?: string): string {
  const contextStr = context ? ` for ${context}` : '';
  return `Status${contextStr}: ${status}`;
}

/**
 * Generate descriptive label for time-based information
 */
export function getTimeLabel(timestamp: Date | string, prefix: string = ''): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const formatted = date.toLocaleString();
  return prefix ? `${prefix} ${formatted}` : formatted;
}

// ============================================================================
// Form Accessibility
// ============================================================================

/**
 * Generate unique ID for form field
 */
export function generateFieldId(name: string, prefix: string = 'field'): string {
  return `${prefix}-${name}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Associate error message with form field
 */
export function getErrorId(fieldId: string): string {
  return `${fieldId}-error`;
}

/**
 * Associate description with form field
 */
export function getDescriptionId(fieldId: string): string {
  return `${fieldId}-description`;
}

/**
 * Build aria-describedby attribute value
 */
export function buildAriaDescribedBy(
  fieldId: string,
  hasError: boolean,
  hasDescription: boolean
): string | undefined {
  const ids: string[] = [];
  
  if (hasDescription) {
    ids.push(getDescriptionId(fieldId));
  }
  
  if (hasError) {
    ids.push(getErrorId(fieldId));
  }
  
  return ids.length > 0 ? ids.join(' ') : undefined;
}

// ============================================================================
// Heading Hierarchy
// ============================================================================

/**
 * Validate heading hierarchy (for development)
 */
export function validateHeadingHierarchy(): void {
  if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'development') return;

  const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
  let previousLevel = 0;

  headings.forEach((heading) => {
    const level = parseInt(heading.tagName.charAt(1));
    
    if (level - previousLevel > 1) {
      console.warn(
        `Heading hierarchy violation: ${heading.tagName} follows h${previousLevel}`,
        heading
      );
    }
    
    previousLevel = level;
  });
}

// ============================================================================
// Touch Target Size
// ============================================================================

/**
 * Minimum touch target size (44x44px per WCAG)
 */
export const MIN_TOUCH_TARGET_SIZE = 44;

/**
 * Check if element meets minimum touch target size
 */
export function meetsTouchTargetSize(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return rect.width >= MIN_TOUCH_TARGET_SIZE && rect.height >= MIN_TOUCH_TARGET_SIZE;
}
