/**
 * User ID Helper Utilities
 *
 * Provides type-safe conversion between number and string user IDs
 * for compatibility between different service types.
 */

/**
 * Converts a user ID of any type to a string
 * Handles number, string, null, and undefined inputs
 */
export function toStringUserId(
  userId: number | string | null | undefined,
): string | undefined {
  if (userId === null || userId === undefined) {
    return undefined;
  }
  return String(userId);
}

/**
 * Converts a user ID of any type to a number
 * Handles number, string, null, and undefined inputs
 */
export function toNumberUserId(
  userId: number | string | null | undefined,
): number | undefined {
  if (userId === null || userId === undefined) {
    return undefined;
  }
  if (typeof userId === "number") {
    return userId;
  }
  const parsed = parseInt(userId, 10);
  return isNaN(parsed) ? undefined : parsed;
}

/**
 * Ensures userId is always a string (throws if not convertible)
 */
export function requireStringUserId(
  userId: number | string | null | undefined,
): string {
  const result = toStringUserId(userId);
  if (!result) {
    throw new Error("User ID is required");
  }
  return result;
}

/**
 * Ensures userId is always a number (throws if not convertible)
 */
export function requireNumberUserId(
  userId: number | string | null | undefined,
): number {
  const result = toNumberUserId(userId);
  if (result === undefined) {
    throw new Error("User ID is required");
  }
  return result;
}
