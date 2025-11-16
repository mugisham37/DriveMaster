/**
 * Optimized Image Component
 * 
 * Wrapper around Next.js Image component with performance optimizations.
 * Handles responsive sizing, lazy loading, blur placeholders, and priority loading.
 * 
 * Requirements: 13.1
 * Task: 14.3
 */

'use client';

import React from 'react';
import Image, { ImageProps } from 'next/image';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface OptimizedImageProps extends Omit<ImageProps, 'src'> {
  src: string;
  alt: string;
  /**
   * Whether this image is above the fold (visible on initial load)
   * Above-fold images are loaded with priority and eager loading
   */
  aboveFold?: boolean;
  /**
   * Aspect ratio for the image container
   * Format: "width/height" (e.g., "16/9", "4/3", "1/1")
   */
  aspectRatio?: string;
  /**
   * Whether to show a skeleton loader while image loads
   */
  showSkeleton?: boolean;
  /**
   * Custom skeleton color
   */
  skeletonColor?: string;
  /**
   * Object fit style
   */
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  /**
   * Blur data URL for progressive loading
   * If not provided, a default blur will be used
   */
  blurDataURL?: string;
  /**
   * Container className
   */
  containerClassName?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Optimized Image Component
 * 
 * @example
 * ```tsx
 * // Above-fold hero image
 * <OptimizedImage
 *   src="/hero.jpg"
 *   alt="Hero image"
 *   width={1920}
 *   height={1080}
 *   aboveFold
 *   aspectRatio="16/9"
 * />
 * 
 * // Below-fold lazy-loaded image
 * <OptimizedImage
 *   src="/content.jpg"
 *   alt="Content image"
 *   width={800}
 *   height={600}
 *   aspectRatio="4/3"
 *   showSkeleton
 * />
 * ```
 */
export function OptimizedImage({
  src,
  alt,
  aboveFold = false,
  aspectRatio,
  showSkeleton = true,
  skeletonColor = 'bg-muted',
  objectFit = 'cover',
  blurDataURL,
  containerClassName,
  className,
  ...props
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);

  // Generate default blur data URL if not provided
  const defaultBlurDataURL = 
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2YwZjBmMCIvPjwvc3ZnPg==';

  // Container styles for aspect ratio
  const containerStyle = aspectRatio
    ? { aspectRatio }
    : undefined;

  // Handle load complete
  const handleLoadComplete = () => {
    setIsLoading(false);
  };

  // Handle error
  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  // Error fallback
  if (hasError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-muted text-muted-foreground',
          containerClassName
        )}
        style={containerStyle}
      >
        <div className="text-center p-4">
          <svg
            className="w-12 h-12 mx-auto mb-2 opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-sm">Failed to load image</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('relative overflow-hidden', containerClassName)}
      style={containerStyle}
    >
      {/* Skeleton loader */}
      {showSkeleton && isLoading && (
        <div
          className={cn(
            'absolute inset-0 animate-pulse',
            skeletonColor
          )}
        />
      )}

      {/* Optimized Image */}
      <Image
        src={src}
        alt={alt}
        className={cn(
          'transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100',
          objectFit === 'contain' && 'object-contain',
          objectFit === 'cover' && 'object-cover',
          objectFit === 'fill' && 'object-fill',
          objectFit === 'none' && 'object-none',
          objectFit === 'scale-down' && 'object-scale-down',
          className
        )}
        loading={aboveFold ? 'eager' : 'lazy'}
        priority={aboveFold}
        placeholder={blurDataURL || defaultBlurDataURL ? 'blur' : 'empty'}
        blurDataURL={blurDataURL || defaultBlurDataURL}
        onLoad={handleLoadComplete}
        onError={handleError}
        // Responsive sizes based on common breakpoints
        sizes={
          props.sizes ||
          '(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw'
        }
        {...props}
      />
    </div>
  );
}

// ============================================================================
// Specialized Image Components
// ============================================================================

/**
 * Avatar Image Component
 * Optimized for user avatars with circular shape
 */
export function AvatarImage({
  src,
  alt,
  size = 40,
  className,
  ...props
}: Omit<OptimizedImageProps, 'width' | 'height' | 'aspectRatio'> & {
  size?: number;
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      aspectRatio="1/1"
      objectFit="cover"
      className={cn('rounded-full', className)}
      showSkeleton
      {...props}
    />
  );
}

/**
 * Thumbnail Image Component
 * Optimized for small preview images
 */
export function ThumbnailImage({
  src,
  alt,
  className,
  ...props
}: OptimizedImageProps) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={300}
      height={200}
      aspectRatio="3/2"
      objectFit="cover"
      className={cn('rounded-lg', className)}
      showSkeleton
      {...props}
    />
  );
}

/**
 * Hero Image Component
 * Optimized for large hero/banner images
 */
export function HeroImage({
  src,
  alt,
  className,
  ...props
}: OptimizedImageProps) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={1920}
      height={1080}
      aspectRatio="16/9"
      objectFit="cover"
      aboveFold
      priority
      className={className}
      {...props}
    />
  );
}

/**
 * Content Image Component
 * Optimized for images within content (articles, lessons, etc.)
 */
export function ContentImage({
  src,
  alt,
  className,
  ...props
}: OptimizedImageProps) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={800}
      height={600}
      aspectRatio="4/3"
      objectFit="contain"
      className={cn('rounded-lg', className)}
      showSkeleton
      {...props}
    />
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate blur data URL from image URL
 * This is a placeholder - in production, blur data URLs should be generated
 * at build time or provided by the backend
 */
export function generateBlurDataURL(_imageUrl: string): string {
  // In production, this would call an API or use a build-time process
  // For now, return a default blur
  return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2YwZjBmMCIvPjwvc3ZnPg==';
}

/**
 * Get responsive image sizes string based on layout
 */
export function getResponsiveSizes(layout: 'full' | 'half' | 'third' | 'quarter'): string {
  switch (layout) {
    case 'full':
      return '100vw';
    case 'half':
      return '(max-width: 768px) 100vw, 50vw';
    case 'third':
      return '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw';
    case 'quarter':
      return '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw';
    default:
      return '100vw';
  }
}

/**
 * Check if image should be loaded with priority
 * Based on viewport position and user preferences
 */
export function shouldLoadWithPriority(
  elementRef: React.RefObject<HTMLElement>,
  threshold: number = 0.5
): boolean {
  if (typeof window === 'undefined' || !elementRef.current) {
    return false;
  }

  const rect = elementRef.current.getBoundingClientRect();
  const viewportHeight = window.innerHeight;

  // Check if element is in viewport or close to it
  return rect.top < viewportHeight * threshold;
}
