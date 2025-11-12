"use client";

/**
 * Optimized Avatar Component
 * 
 * Uses Next.js Image component for automatic optimization:
 * - Automatic image optimization and resizing
 * - Lazy loading for images below the fold
 * - Modern image formats (WebP, AVIF) when supported
 * - Responsive images with srcset
 * 
 * Requirements: 20.1
 */

import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface OptimizedAvatarProps {
  src?: string | null | undefined;
  alt: string;
  fallback: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  priority?: boolean; // Set to true for above-the-fold images
}

const sizeMap = {
  sm: { container: "h-8 w-8", text: "text-xs", pixels: 32 },
  md: { container: "h-12 w-12", text: "text-base", pixels: 48 },
  lg: { container: "h-16 w-16", text: "text-lg", pixels: 64 },
  xl: { container: "h-24 w-24", text: "text-2xl", pixels: 96 },
};

export function OptimizedAvatar({
  src,
  alt,
  fallback,
  size = "md",
  className,
  priority = false,
}: OptimizedAvatarProps) {
  const sizeConfig = sizeMap[size];

  // If no src, just show fallback
  if (!src) {
    return (
      <Avatar className={cn(sizeConfig.container, className)}>
        <AvatarFallback className={sizeConfig.text}>{fallback}</AvatarFallback>
      </Avatar>
    );
  }

  // Check if it's an external URL or internal
  const isExternal = src.startsWith("http://") || src.startsWith("https://");

  return (
    <Avatar className={cn(sizeConfig.container, className)}>
      {isExternal ? (
        // For external URLs, use standard AvatarImage
        <AvatarImage src={src} alt={alt} />
      ) : (
        // For internal URLs, use Next.js Image for optimization
        <div className="relative w-full h-full overflow-hidden rounded-full">
          <Image
            src={src}
            alt={alt}
            fill
            sizes={`${sizeConfig.pixels}px`}
            className="object-cover"
            priority={priority}
            quality={90}
            // Enable lazy loading for images below the fold
            loading={priority ? "eager" : "lazy"}
          />
        </div>
      )}
      <AvatarFallback className={sizeConfig.text}>{fallback}</AvatarFallback>
    </Avatar>
  );
}

/**
 * Optimized Avatar Group Component
 * For displaying multiple avatars in a row
 */
interface OptimizedAvatarGroupProps {
  avatars: Array<{
    src?: string | null | undefined;
    alt: string;
    fallback: string;
  }>;
  size?: "sm" | "md" | "lg" | "xl";
  max?: number; // Maximum number of avatars to show
  className?: string;
}

export function OptimizedAvatarGroup({
  avatars,
  size = "md",
  max = 5,
  className,
}: OptimizedAvatarGroupProps) {
  const displayAvatars = avatars.slice(0, max);
  const remainingCount = Math.max(0, avatars.length - max);

  const sizeConfig = sizeMap[size];

  return (
    <div className={cn("flex -space-x-2", className)}>
      {displayAvatars.map((avatar, index) => (
        <OptimizedAvatar
          key={index}
          src={avatar.src}
          alt={avatar.alt}
          fallback={avatar.fallback}
          size={size}
          className="ring-2 ring-background"
          priority={index === 0} // Only prioritize first avatar
        />
      ))}
      {remainingCount > 0 && (
        <Avatar className={cn(sizeConfig.container, "ring-2 ring-background")}>
          <AvatarFallback className={sizeConfig.text}>
            +{remainingCount}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
