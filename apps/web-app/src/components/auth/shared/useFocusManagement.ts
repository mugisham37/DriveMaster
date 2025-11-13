/**
 * Focus Management Hooks
 * 
 * Utilities for managing focus in authentication flows
 * Implements WCAG 2.1 AA focus management requirements
 * 
 * Features:
 * - Auto-focus first input in forms
 * - Focus first error on validation failure
 * - Focus management on route transitions
 * - Restore focus after modal close
 * 
 * Requirements: 15.4 (Task 14.2)
 */

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

// ============================================================================
// Auto-focus First Input
// ============================================================================

/**
 * Auto-focuses the first input field in a form
 * Useful for improving keyboard navigation UX
 * 
 * @param enabled - Whether to enable auto-focus (default: true)
 * @param delay - Delay before focusing in ms (default: 100)
 * 
 * @example
 * ```tsx
 * function LoginForm() {
 *   const formRef = useAutoFocusFirstInput();
 *   return <form ref={formRef}>...</form>;
 * }
 * ```
 */
export function useAutoFocusFirstInput(enabled = true, delay = 100) {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!enabled) return;

    const timer = setTimeout(() => {
      const form = formRef.current;
      if (!form) return;

      // Find first focusable input
      const firstInput = form.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
        'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled])'
      );

      if (firstInput) {
        firstInput.focus();
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [enabled, delay]);

  return formRef;
}

// ============================================================================
// Focus First Error
// ============================================================================

/**
 * Focuses the first field with an error when validation fails
 * Improves accessibility by directing user attention to errors
 * 
 * @param errors - Form errors object from react-hook-form
 * 
 * @example
 * ```tsx
 * function LoginForm() {
 *   const { formState: { errors } } = useForm();
 *   useFocusFirstError(errors);
 *   return <form>...</form>;
 * }
 * ```
 */
export function useFocusFirstError(errors: Record<string, any>) {
  const previousErrorCount = useRef(0);

  useEffect(() => {
    const errorKeys = Object.keys(errors);
    const currentErrorCount = errorKeys.length;

    // Only focus if new errors appeared
    if (currentErrorCount > 0 && currentErrorCount > previousErrorCount.current) {
      const firstErrorField = errorKeys[0];
      if (firstErrorField) {
        const element = document.getElementById(firstErrorField);

        if (element) {
          element.focus();
          // Scroll into view if needed
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }

    previousErrorCount.current = currentErrorCount;
  }, [errors]);
}

// ============================================================================
// Route Transition Focus
// ============================================================================

/**
 * Manages focus on route transitions
 * Focuses the main heading (h1) when navigating to a new page
 * Announces page change to screen readers
 * 
 * @param enabled - Whether to enable route focus management (default: true)
 * 
 * @example
 * ```tsx
 * function AuthLayout({ children }) {
 *   useRouteFocusManagement();
 *   return <div>{children}</div>;
 * }
 * ```
 */
export function useRouteFocusManagement(enabled = true) {
  const pathname = usePathname();
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (!enabled) return;

    // Only run on actual route changes
    if (pathname === previousPathname.current) return;

    previousPathname.current = pathname;

    // Small delay to ensure content is rendered
    const timer = setTimeout(() => {
      // Try to focus the main heading
      const heading = document.querySelector<HTMLHeadingElement>('h1, [role="heading"][aria-level="1"]');

      if (heading) {
        // Make heading focusable if it isn't already
        if (!heading.hasAttribute('tabindex')) {
          heading.setAttribute('tabindex', '-1');
        }

        heading.focus();

        // Remove tabindex after focus to restore natural tab order
        heading.addEventListener('blur', () => {
          heading.removeAttribute('tabindex');
        }, { once: true });
      } else {
        // Fallback: focus the main content area
        const main = document.querySelector<HTMLElement>('main, [role="main"]');
        if (main) {
          if (!main.hasAttribute('tabindex')) {
            main.setAttribute('tabindex', '-1');
          }
          main.focus();
          main.addEventListener('blur', () => {
            main.removeAttribute('tabindex');
          }, { once: true });
        }
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [pathname, enabled]);
}

// ============================================================================
// Focus Trap (for modals)
// ============================================================================

/**
 * Creates a focus trap within a container
 * Useful for modals and dialogs
 * Note: Radix UI Dialog already handles this, but provided for custom implementations
 * 
 * @param containerRef - Ref to the container element
 * @param enabled - Whether the trap is active
 * 
 * @example
 * ```tsx
 * function CustomModal({ isOpen }) {
 *   const modalRef = useFocusTrap(isOpen);
 *   return <div ref={modalRef}>...</div>;
 * }
 * ```
 */
export function useFocusTrap(enabled = true) {
  const containerRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const container = containerRef.current;
    if (!container) return;

    // Store the previously focused element
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Get all focusable elements
    const getFocusableElements = () => {
      return container.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
    };

    // Focus first element
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0]?.focus();
    }

    // Handle tab key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = getFocusableElements();
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    // Cleanup: restore focus
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [enabled]);

  return containerRef;
}

// ============================================================================
// Skip to Content Link
// ============================================================================

/**
 * Hook to manage skip-to-content functionality
 * Provides a way for keyboard users to skip navigation
 * 
 * @example
 * ```tsx
 * function Layout() {
 *   const { skipToContent, mainRef } = useSkipToContent();
 *   return (
 *     <>
 *       <button onClick={skipToContent}>Skip to content</button>
 *       <main ref={mainRef}>...</main>
 *     </>
 *   );
 * }
 * ```
 */
export function useSkipToContent() {
  const mainRef = useRef<HTMLElement>(null);

  const skipToContent = () => {
    const main = mainRef.current;
    if (!main) return;

    // Make main focusable temporarily
    main.setAttribute('tabindex', '-1');
    main.focus();

    // Remove tabindex after blur
    main.addEventListener('blur', () => {
      main.removeAttribute('tabindex');
    }, { once: true });
  };

  return { skipToContent, mainRef };
}

// ============================================================================
// Announce to Screen Readers
// ============================================================================

/**
 * Announces a message to screen readers
 * Creates a live region and announces the message
 * 
 * @param message - Message to announce
 * @param priority - 'polite' or 'assertive' (default: 'polite')
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const announce = useAnnounce();
 *   
 *   const handleSuccess = () => {
 *     announce('Form submitted successfully');
 *   };
 * }
 * ```
 */
export function useAnnounce() {
  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    // Find or create live region
    let liveRegion = document.getElementById('a11y-announcer');

    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'a11y-announcer';
      liveRegion.setAttribute('role', 'status');
      liveRegion.setAttribute('aria-live', priority);
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.className = 'sr-only';
      document.body.appendChild(liveRegion);
    }

    // Update aria-live if priority changed
    liveRegion.setAttribute('aria-live', priority);

    // Clear and set message
    liveRegion.textContent = '';
    setTimeout(() => {
      liveRegion!.textContent = message;
    }, 100);

    // Clear after announcement
    setTimeout(() => {
      liveRegion!.textContent = '';
    }, 5000);
  };

  return announce;
}

// ============================================================================
// Exports
// ============================================================================

export default {
  useAutoFocusFirstInput,
  useFocusFirstError,
  useRouteFocusManagement,
  useFocusTrap,
  useSkipToContent,
  useAnnounce,
};
