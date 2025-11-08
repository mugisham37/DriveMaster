/**
 * Media Optimization Utilities
 *
 * Utilities for optimizing media assets (images, videos) for web delivery
 */

export interface MediaOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: "webp" | "jpeg" | "png" | "avif";
}

export interface OptimizedMedia {
  url: string;
  format: string;
  width: number;
  height: number;
  size: number;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates a file before upload
 */
export function validateFile(file: File): FileValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Maximum file size: 100MB
  const maxSize = 100 * 1024 * 1024;
  if (file.size > maxSize) {
    errors.push(
      `File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`,
    );
  }

  // Warn for large files (> 10MB)
  const warningSize = 10 * 1024 * 1024;
  if (file.size > warningSize && file.size <= maxSize) {
    warnings.push(
      `File size is large (${(file.size / 1024 / 1024).toFixed(2)}MB). Consider optimizing.`,
    );
  }

  // Validate file type
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
    "video/mp4",
    "video/webm",
    "video/ogg",
    "application/pdf",
    "text/plain",
  ];

  if (!allowedTypes.includes(file.type)) {
    errors.push(`File type ${file.type} is not supported`);
  }

  // Validate file name
  if (!file.name || file.name.trim() === "") {
    errors.push("File name is required");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Optimizes an image for web delivery and returns a File
 */
export async function optimizeImage(
  file: File,
  options: MediaOptimizationOptions = {},
): Promise<File> {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 85,
    format = "webp",
  } = options;

  // Create an image element to load the file
  const img = new Image();
  const objectUrl = URL.createObjectURL(file);

  return new Promise((resolve, reject) => {
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      // Create canvas and draw resized image
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Failed to create blob"));
            return;
          }

          // Create a File from the Blob
          const optimizedFile = new File([blob], file.name, {
            type: `image/${format}`,
            lastModified: Date.now(),
          });

          resolve(optimizedFile);
        },
        `image/${format}`,
        quality / 100,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image"));
    };

    img.src = objectUrl;
  });
}

/**
 * Generates responsive image sizes
 */
export function generateResponsiveSizes(
  originalWidth: number,
  originalHeight: number,
): Array<{ width: number; height: number }> {
  const breakpoints = [640, 768, 1024, 1280, 1920];
  const aspectRatio = originalHeight / originalWidth;

  return breakpoints
    .filter((width) => width < originalWidth)
    .map((width) => ({
      width,
      height: Math.round(width * aspectRatio),
    }));
}
