"use client";

/**
 * User Management Context with Comprehensive Profile State Management
 *
 * Implements:
 * - UserContext with comprehensive user profile state management
 * - Profile fetching, updating, and caching integration
 * - Optimistic updates for profile changes with rollback capability
 * - User preference management with validation and persistence
 * - Requirements: 1.1, 1.2, 1.3, 1.4
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./AuthContext";
import { userServiceClient } from "@/lib/user-service";
import {
  getUserServiceCacheManager,
  getOptimisticUpdateManager,
  queryKeys,
  CACHE_TIMES,
  createUserServiceQueryOptions,
} from "@/lib/cache/user-service-cache";
import type {
  UserProfile,
  UserPreferences,
  PreferencesData,
  UserUpdateRequest,
  UserServiceError,
} from "@/types/user-service";

// ============================================================================
// State Types
// ============================================================================

export interface UserState {
  // Profile data
  profile: UserProfile | null;
  preferences: UserPreferences | null;

  // Loading states
  isLoading: boolean;
  isProfileLoading: boolean;
  isPreferencesLoading: boolean;
  isUpdating: boolean;
  isProfileUpdating: boolean;
  isPreferencesUpdating: boolean;

  // Error states
  error: UserServiceError | null;
  profileError: UserServiceError | null;
  preferencesError: UserServiceError | null;

  // Optimistic update state
  optimisticUpdates: {
    profile: boolean;
    preferences: boolean;
  };

  // Validation state
  validationErrors: {
    profile: Record<string, string>;
    preferences: Record<string, string>;
  };
}

// ============================================================================
// Action Types
// ============================================================================

export type UserAction =
  // Profile actions
  | { type: "PROFILE_FETCH_START" }
  | { type: "PROFILE_FETCH_SUCCESS"; payload: { profile: UserProfile } }
  | { type: "PROFILE_FETCH_ERROR"; payload: { error: UserServiceError } }
  | { type: "PROFILE_UPDATE_START"; payload: { optimistic?: boolean } }
  | { type: "PROFILE_UPDATE_SUCCESS"; payload: { profile: UserProfile } }
  | { type: "PROFILE_UPDATE_ERROR"; payload: { error: UserServiceError } }
  | { type: "PROFILE_OPTIMISTIC_UPDATE"; payload: { profile: UserProfile } }
  | { type: "PROFILE_ROLLBACK_OPTIMISTIC" }

  // Preferences actions
  | { type: "PREFERENCES_FETCH_START" }
  | {
      type: "PREFERENCES_FETCH_SUCCESS";
      payload: { preferences: UserPreferences };
    }
  | { type: "PREFERENCES_FETCH_ERROR"; payload: { error: UserServiceError } }
  | { type: "PREFERENCES_UPDATE_START"; payload: { optimistic?: boolean } }
  | {
      type: "PREFERENCES_UPDATE_SUCCESS";
      payload: { preferences: UserPreferences };
    }
  | { type: "PREFERENCES_UPDATE_ERROR"; payload: { error: UserServiceError } }
  | {
      type: "PREFERENCES_OPTIMISTIC_UPDATE";
      payload: { preferences: UserPreferences };
    }
  | { type: "PREFERENCES_ROLLBACK_OPTIMISTIC" }

  // Validation actions
  | {
      type: "SET_PROFILE_VALIDATION_ERRORS";
      payload: { errors: Record<string, string> };
    }
  | {
      type: "SET_PREFERENCES_VALIDATION_ERRORS";
      payload: { errors: Record<string, string> };
    }
  | {
      type: "CLEAR_VALIDATION_ERRORS";
      payload?: { type?: "profile" | "preferences" };
    }

  // Error management
  | { type: "CLEAR_ERROR"; payload?: { errorType?: "profile" | "preferences" } }
  | { type: "CLEAR_ALL_ERRORS" };

// ============================================================================
// Initial State
// ============================================================================

const initialState: UserState = {
  profile: null,
  preferences: null,

  isLoading: false,
  isProfileLoading: false,
  isPreferencesLoading: false,
  isUpdating: false,
  isProfileUpdating: false,
  isPreferencesUpdating: false,

  error: null,
  profileError: null,
  preferencesError: null,

  optimisticUpdates: {
    profile: false,
    preferences: false,
  },

  validationErrors: {
    profile: {},
    preferences: {},
  },
};

// ============================================================================
// Reducer
// ============================================================================

function userReducer(state: UserState, action: UserAction): UserState {
  switch (action.type) {
    // Profile fetch
    case "PROFILE_FETCH_START":
      return {
        ...state,
        isProfileLoading: true,
        isLoading: true,
        profileError: null,
      };

    case "PROFILE_FETCH_SUCCESS":
      return {
        ...state,
        isProfileLoading: false,
        isLoading: false,
        profile: action.payload.profile,
        profileError: null,
        optimisticUpdates: {
          ...state.optimisticUpdates,
          profile: false,
        },
      };

    case "PROFILE_FETCH_ERROR":
      return {
        ...state,
        isProfileLoading: false,
        isLoading: false,
        profileError: action.payload.error,
      };

    // Profile update
    case "PROFILE_UPDATE_START":
      return {
        ...state,
        isProfileUpdating: true,
        isUpdating: true,
        profileError: null,
        optimisticUpdates: {
          ...state.optimisticUpdates,
          profile: action.payload.optimistic || false,
        },
      };

    case "PROFILE_UPDATE_SUCCESS":
      return {
        ...state,
        isProfileUpdating: false,
        isUpdating: false,
        profile: action.payload.profile,
        profileError: null,
        optimisticUpdates: {
          ...state.optimisticUpdates,
          profile: false,
        },
        validationErrors: {
          ...state.validationErrors,
          profile: {},
        },
      };

    case "PROFILE_UPDATE_ERROR":
      return {
        ...state,
        isProfileUpdating: false,
        isUpdating: false,
        profileError: action.payload.error,
        optimisticUpdates: {
          ...state.optimisticUpdates,
          profile: false,
        },
      };

    case "PROFILE_OPTIMISTIC_UPDATE":
      return {
        ...state,
        profile: action.payload.profile,
        optimisticUpdates: {
          ...state.optimisticUpdates,
          profile: true,
        },
      };

    case "PROFILE_ROLLBACK_OPTIMISTIC":
      return {
        ...state,
        optimisticUpdates: {
          ...state.optimisticUpdates,
          profile: false,
        },
      };

    // Preferences fetch
    case "PREFERENCES_FETCH_START":
      return {
        ...state,
        isPreferencesLoading: true,
        isLoading: true,
        preferencesError: null,
      };

    case "PREFERENCES_FETCH_SUCCESS":
      return {
        ...state,
        isPreferencesLoading: false,
        isLoading: false,
        preferences: action.payload.preferences,
        preferencesError: null,
        optimisticUpdates: {
          ...state.optimisticUpdates,
          preferences: false,
        },
      };

    case "PREFERENCES_FETCH_ERROR":
      return {
        ...state,
        isPreferencesLoading: false,
        isLoading: false,
        preferencesError: action.payload.error,
      };

    // Preferences update
    case "PREFERENCES_UPDATE_START":
      return {
        ...state,
        isPreferencesUpdating: true,
        isUpdating: true,
        preferencesError: null,
        optimisticUpdates: {
          ...state.optimisticUpdates,
          preferences: action.payload.optimistic || false,
        },
      };

    case "PREFERENCES_UPDATE_SUCCESS":
      return {
        ...state,
        isPreferencesUpdating: false,
        isUpdating: false,
        preferences: action.payload.preferences,
        preferencesError: null,
        optimisticUpdates: {
          ...state.optimisticUpdates,
          preferences: false,
        },
        validationErrors: {
          ...state.validationErrors,
          preferences: {},
        },
      };

    case "PREFERENCES_UPDATE_ERROR":
      return {
        ...state,
        isPreferencesUpdating: false,
        isUpdating: false,
        preferencesError: action.payload.error,
        optimisticUpdates: {
          ...state.optimisticUpdates,
          preferences: false,
        },
      };

    case "PREFERENCES_OPTIMISTIC_UPDATE":
      return {
        ...state,
        preferences: action.payload.preferences,
        optimisticUpdates: {
          ...state.optimisticUpdates,
          preferences: true,
        },
      };

    case "PREFERENCES_ROLLBACK_OPTIMISTIC":
      return {
        ...state,
        optimisticUpdates: {
          ...state.optimisticUpdates,
          preferences: false,
        },
      };

    // Validation errors
    case "SET_PROFILE_VALIDATION_ERRORS":
      return {
        ...state,
        validationErrors: {
          ...state.validationErrors,
          profile: action.payload.errors,
        },
      };

    case "SET_PREFERENCES_VALIDATION_ERRORS":
      return {
        ...state,
        validationErrors: {
          ...state.validationErrors,
          preferences: action.payload.errors,
        },
      };

    case "CLEAR_VALIDATION_ERRORS":
      if (action.payload?.type) {
        return {
          ...state,
          validationErrors: {
            ...state.validationErrors,
            [action.payload.type]: {},
          },
        };
      }
      return {
        ...state,
        validationErrors: {
          profile: {},
          preferences: {},
        },
      };

    // Error management
    case "CLEAR_ERROR":
      if (action.payload?.errorType === "profile") {
        return { ...state, profileError: null };
      }
      if (action.payload?.errorType === "preferences") {
        return { ...state, preferencesError: null };
      }
      return { ...state, error: null };

    case "CLEAR_ALL_ERRORS":
      return {
        ...state,
        error: null,
        profileError: null,
        preferencesError: null,
        validationErrors: {
          profile: {},
          preferences: {},
        },
      };

    default:
      return state;
  }
}

// ============================================================================
// Context Definition
// ============================================================================

export interface UserContextValue {
  // State
  state: UserState;

  // Computed properties
  profile: UserProfile | null;
  preferences: UserPreferences | null;
  isLoading: boolean;
  isUpdating: boolean;
  error: UserServiceError | null;

  // Profile operations
  fetchProfile: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;

  // Preferences operations
  fetchPreferences: () => Promise<void>;
  updatePreferences: (preferences: Partial<PreferencesData>) => Promise<void>;
  resetPreferences: () => Promise<void>;

  // Validation
  validateProfile: (profile: Partial<UserProfile>) => Record<string, string>;
  validatePreferences: (
    preferences: Partial<PreferencesData>,
  ) => Record<string, string>;

  // Utility functions
  clearError: (errorType?: "profile" | "preferences") => void;
  clearAllErrors: () => void;
  isProfileComplete: () => boolean;
  getDisplayName: () => string;

  // Account operations
  deactivateAccount: (reason: string) => Promise<void>;
  checkProfileCompleteness: () => {
    isComplete: boolean;
    missingFields: string[];
  };
  generateDisplayName: () => string;
  linkAccount: (
    provider: string,
    credentials: Record<string, unknown>,
  ) => Promise<void>;

  // Error handling and recovery
  getErrorMessage: (error: UserServiceError) => string;
  getRecoveryActions: (
    error: UserServiceError,
  ) => Array<{ label: string; action: () => void }>;
  retryFailedOperation: (
    operationType: "profile" | "preferences",
  ) => Promise<void>;
}

const UserContext = createContext<UserContextValue | null>(null);

// ============================================================================
// Validation Functions
// ============================================================================

function validateUserProfile(
  profile: Partial<UserProfile>,
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (profile.email !== undefined) {
    if (!profile.email || profile.email.trim() === "") {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
      errors.email = "Please enter a valid email address";
    }
  }

  if (profile.timezone !== undefined) {
    if (!profile.timezone || profile.timezone.trim() === "") {
      errors.timezone = "Timezone is required";
    }
  }

  if (profile.language !== undefined) {
    if (!profile.language || profile.language.trim() === "") {
      errors.language = "Language is required";
    }
  }

  if (profile.countryCode !== undefined) {
    if (!profile.countryCode || profile.countryCode.trim() === "") {
      errors.countryCode = "Country is required";
    } else if (!/^[A-Z]{2}$/.test(profile.countryCode)) {
      errors.countryCode = "Country code must be a valid 2-letter code";
    }
  }

  return errors;
}

function validateUserPreferences(
  preferences: Partial<PreferencesData>,
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (preferences.theme !== undefined) {
    if (!["light", "dark", "system"].includes(preferences.theme)) {
      errors.theme = "Theme must be light, dark, or system";
    }
  }

  if (preferences.language !== undefined) {
    if (!preferences.language || preferences.language.trim() === "") {
      errors.language = "Language is required";
    }
  }

  if (preferences.learning?.difficulty !== undefined) {
    if (
      !["beginner", "intermediate", "advanced"].includes(
        preferences.learning.difficulty,
      )
    ) {
      errors["learning.difficulty"] =
        "Difficulty must be beginner, intermediate, or advanced";
    }
  }

  if (preferences.learning?.pace !== undefined) {
    if (!["slow", "normal", "fast"].includes(preferences.learning.pace)) {
      errors["learning.pace"] = "Pace must be slow, normal, or fast";
    }
  }

  if (preferences.privacy?.profileVisibility !== undefined) {
    if (
      !["public", "private", "friends"].includes(
        preferences.privacy.profileVisibility,
      )
    ) {
      errors["privacy.profileVisibility"] =
        "Profile visibility must be public, private, or friends";
    }
  }

  return errors;
}

// ============================================================================
// Provider Component
// ============================================================================

export interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const [state, dispatch] = useReducer(userReducer, initialState);
  const { user: authUser, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const userId = authUser?.id?.toString();

  // ============================================================================
  // React Query Integration
  // ============================================================================

  // Profile query
  const profileQuery = useQuery<UserProfile, UserServiceError>({
    queryKey: queryKeys.userProfile(userId || ""),
    queryFn: () => userServiceClient.getUser(userId!),
    enabled: !!userId && isAuthenticated,
    ...createUserServiceQueryOptions<UserProfile, UserServiceError>(
      CACHE_TIMES.USER_PROFILE,
    ),
  });

  // Preferences query
  const preferencesQuery = useQuery<UserPreferences, UserServiceError>({
    queryKey: queryKeys.userPreferences(userId || ""),
    queryFn: () => userServiceClient.getUserPreferences(userId!),
    enabled: !!userId && isAuthenticated,
    ...createUserServiceQueryOptions<UserPreferences, UserServiceError>(
      CACHE_TIMES.USER_PREFERENCES,
    ),
  });

  // Profile update mutation
  const profileUpdateMutation = useMutation({
    mutationFn: async (updates: Partial<UserProfile>) => {
      if (!userId) throw new Error("User not authenticated");

      const updateRequest: UserUpdateRequest = {
        ...updates,
        version: state.profile?.version || 0,
      };

      return await userServiceClient.updateUser(userId, updateRequest);
    },
    onMutate: async (updates) => {
      dispatch({ type: "PROFILE_UPDATE_START", payload: { optimistic: true } });

      // Optimistic update
      if (state.profile) {
        const optimisticProfile = { ...state.profile, ...updates };
        dispatch({
          type: "PROFILE_OPTIMISTIC_UPDATE",
          payload: { profile: optimisticProfile },
        });

        // Update cache optimistically
        const optimisticUpdateManager = getOptimisticUpdateManager();
        const context =
          await optimisticUpdateManager.optimisticUserProfileUpdate(
            userId!,
            (oldProfile) =>
              oldProfile ? { ...oldProfile, ...updates } : optimisticProfile,
          );
        return context;
      }

      return undefined;
    },
    onSuccess: (profile: UserProfile) => {
      dispatch({ type: "PROFILE_UPDATE_SUCCESS", payload: { profile } });

      // Invalidate related caches
      const cacheManager = getUserServiceCacheManager();
      cacheManager.invalidateUserProfile(userId!).catch(console.warn);
    },
    onError: (error: UserServiceError, _variables, context) => {
      dispatch({ type: "PROFILE_UPDATE_ERROR", payload: { error } });

      // Rollback optimistic update
      if (context) {
        const optimisticUpdateManager = getOptimisticUpdateManager();
        optimisticUpdateManager.rollback(
          context.queryKey,
          context.previousData,
        );
        dispatch({ type: "PROFILE_ROLLBACK_OPTIMISTIC" });
      }
    },
  });

  // Preferences update mutation
  const preferencesUpdateMutation = useMutation({
    mutationFn: async (preferences: Partial<PreferencesData>) => {
      if (!userId) throw new Error("User not authenticated");

      return await userServiceClient.updatePreferences(userId, preferences);
    },
    onMutate: async (preferences) => {
      dispatch({
        type: "PREFERENCES_UPDATE_START",
        payload: { optimistic: true },
      });

      // Optimistic update
      if (state.preferences) {
        const optimisticPreferences = {
          ...state.preferences,
          preferences: { ...state.preferences.preferences, ...preferences },
        };
        dispatch({
          type: "PREFERENCES_OPTIMISTIC_UPDATE",
          payload: { preferences: optimisticPreferences },
        });

        // Update cache optimistically
        const optimisticUpdateManager = getOptimisticUpdateManager();
        const context =
          await optimisticUpdateManager.optimisticUserPreferencesUpdate(
            userId!,
            (oldPreferences) =>
              oldPreferences
                ? {
                    ...oldPreferences,
                    preferences: {
                      ...oldPreferences.preferences,
                      ...preferences,
                    },
                  }
                : optimisticPreferences,
          );
        return context;
      }

      return undefined;
    },
    onSuccess: (preferences: UserPreferences) => {
      dispatch({
        type: "PREFERENCES_UPDATE_SUCCESS",
        payload: { preferences },
      });

      // Invalidate related caches
      const cacheManager = getUserServiceCacheManager();
      cacheManager.invalidateUserProfile(userId!).catch(console.warn);
    },
    onError: (error: UserServiceError, _variables, context) => {
      dispatch({ type: "PREFERENCES_UPDATE_ERROR", payload: { error } });

      // Rollback optimistic update
      if (context) {
        const optimisticUpdateManager = getOptimisticUpdateManager();
        optimisticUpdateManager.rollback(
          context.queryKey,
          context.previousData,
        );
        dispatch({ type: "PREFERENCES_ROLLBACK_OPTIMISTIC" });
      }
    },
  });

  // ============================================================================
  // Effects for data synchronization
  // ============================================================================

  useEffect(() => {
    if (profileQuery.isLoading && !state.isProfileLoading) {
      dispatch({ type: "PROFILE_FETCH_START" });
    }
    if (preferencesQuery.isLoading && !state.isPreferencesLoading) {
      dispatch({ type: "PREFERENCES_FETCH_START" });
    }
  }, [
    profileQuery.isLoading,
    preferencesQuery.isLoading,
    state.isProfileLoading,
    state.isPreferencesLoading,
  ]);

  // Sync successful data fetches
  useEffect(() => {
    if (
      profileQuery.data &&
      !profileQuery.isLoading &&
      !state.optimisticUpdates.profile
    ) {
      dispatch({
        type: "PROFILE_FETCH_SUCCESS",
        payload: { profile: profileQuery.data },
      });
    }
  }, [
    profileQuery.data,
    profileQuery.isLoading,
    state.optimisticUpdates.profile,
  ]);

  useEffect(() => {
    if (
      preferencesQuery.data &&
      !preferencesQuery.isLoading &&
      !state.optimisticUpdates.preferences
    ) {
      dispatch({
        type: "PREFERENCES_FETCH_SUCCESS",
        payload: { preferences: preferencesQuery.data },
      });
    }
  }, [
    preferencesQuery.data,
    preferencesQuery.isLoading,
    state.optimisticUpdates.preferences,
  ]);

  // Sync errors
  useEffect(() => {
    if (profileQuery.error && !profileQuery.isLoading) {
      dispatch({
        type: "PROFILE_FETCH_ERROR",
        payload: { error: profileQuery.error },
      });
    }
  }, [profileQuery.error, profileQuery.isLoading]);

  useEffect(() => {
    if (preferencesQuery.error && !preferencesQuery.isLoading) {
      dispatch({
        type: "PREFERENCES_FETCH_ERROR",
        payload: { error: preferencesQuery.error },
      });
    }
  }, [preferencesQuery.error, preferencesQuery.isLoading]);

  // ============================================================================
  // Action Handlers
  // ============================================================================

  const fetchProfile = useCallback(async () => {
    if (!userId) return;
    await profileQuery.refetch();
  }, [userId, profileQuery]);

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      // Validate updates
      const validationErrors = validateUserProfile(updates);
      if (Object.keys(validationErrors).length > 0) {
        dispatch({
          type: "SET_PROFILE_VALIDATION_ERRORS",
          payload: { errors: validationErrors },
        });
        throw new Error("Validation failed");
      }

      dispatch({
        type: "CLEAR_VALIDATION_ERRORS",
        payload: { type: "profile" },
      });
      await profileUpdateMutation.mutateAsync(updates);
    },
    [profileUpdateMutation],
  );

  const refreshProfile = useCallback(async () => {
    if (!userId) return;
    await queryClient.invalidateQueries({
      queryKey: queryKeys.userProfile(userId),
    });
  }, [userId, queryClient]);

  const fetchPreferences = useCallback(async () => {
    if (!userId) return;
    await preferencesQuery.refetch();
  }, [userId, preferencesQuery]);

  const updatePreferences = useCallback(
    async (preferences: Partial<PreferencesData>) => {
      // Validate preferences
      const validationErrors = validateUserPreferences(preferences);
      if (Object.keys(validationErrors).length > 0) {
        dispatch({
          type: "SET_PREFERENCES_VALIDATION_ERRORS",
          payload: { errors: validationErrors },
        });
        throw new Error("Validation failed");
      }

      dispatch({
        type: "CLEAR_VALIDATION_ERRORS",
        payload: { type: "preferences" },
      });
      await preferencesUpdateMutation.mutateAsync(preferences);
    },
    [preferencesUpdateMutation],
  );

  const resetPreferences = useCallback(async () => {
    if (!userId) return;

    // Reset to default preferences
    const defaultPreferences: PreferencesData = {
      theme: "system",
      language: "en",
      notifications: {
        email: true,
        push: true,
        inApp: true,
        marketing: false,
        reminders: true,
      },
      privacy: {
        profileVisibility: "public",
        activityTracking: true,
        dataSharing: false,
        analytics: true,
      },
      learning: {
        difficulty: "intermediate",
        pace: "normal",
        reminders: true,
        streakNotifications: true,
      },
      accessibility: {
        highContrast: false,
        largeText: false,
        reducedMotion: false,
        screenReader: false,
      },
    };

    await updatePreferences(defaultPreferences);
  }, [userId, updatePreferences]);

  // ============================================================================
  // Utility Functions
  // ============================================================================

  const validateProfile = useCallback((profile: Partial<UserProfile>) => {
    return validateUserProfile(profile);
  }, []);

  const validatePreferences = useCallback(
    (preferences: Partial<PreferencesData>) => {
      return validateUserPreferences(preferences);
    },
    [],
  );

  const clearError = useCallback((errorType?: "profile" | "preferences") => {
    if (errorType) {
      dispatch({ type: "CLEAR_ERROR", payload: { errorType } });
    } else {
      dispatch({ type: "CLEAR_ERROR" });
    }
  }, []);

  const clearAllErrors = useCallback(() => {
    dispatch({ type: "CLEAR_ALL_ERRORS" });
  }, []);

  const isProfileComplete = useCallback(() => {
    if (!state.profile) return false;

    const requiredFields = ["email", "timezone", "language", "countryCode"];
    return requiredFields.every((field) => {
      const value = state.profile![field as keyof UserProfile];
      return value !== null && value !== undefined && value !== "";
    });
  }, [state.profile]);

  const getDisplayName = useCallback(() => {
    if (!state.profile) return "User";

    // Try to get display name from profile
    if (state.profile.email) {
      const emailPart = state.profile.email.split("@")[0];
      if (emailPart) {
        return emailPart.charAt(0).toUpperCase() + emailPart.slice(1);
      }
    }

    return "User";
  }, [state.profile]);

  // ============================================================================
  // Account Management Operations (Task 5.2)
  // ============================================================================

  const deactivateAccount = useCallback(
    async (reason: string) => {
      if (!userId) throw new Error("User not authenticated");

      try {
        await userServiceClient.deactivateUser(userId, reason);

        // Clear all user-related caches
        const cacheManager = getUserServiceCacheManager();
        await cacheManager.invalidateUser(userId);

        // Note: This would typically trigger a logout flow
        // The actual logout should be handled by the auth context
      } catch (error) {
        const userServiceError: UserServiceError =
          error instanceof Error
            ? {
                type: "service",
                message: error.message,
                recoverable: true,
              }
            : {
                type: "service",
                message: "Failed to deactivate account",
                recoverable: true,
              };

        dispatch({
          type: "PROFILE_UPDATE_ERROR",
          payload: { error: userServiceError },
        });
        throw error;
      }
    },
    [userId],
  );

  const checkProfileCompleteness = useCallback(() => {
    if (!state.profile) {
      return {
        isComplete: false,
        missingFields: ["email", "timezone", "language", "countryCode"],
      };
    }

    const requiredFields = [
      { key: "email", label: "Email Address" },
      { key: "timezone", label: "Timezone" },
      { key: "language", label: "Language" },
      { key: "countryCode", label: "Country" },
    ];

    const missingFields: string[] = [];

    requiredFields.forEach((field) => {
      const value = state.profile![field.key as keyof UserProfile];
      if (!value || (typeof value === "string" && value.trim() === "")) {
        missingFields.push(field.label);
      }
    });

    return {
      isComplete: missingFields.length === 0,
      missingFields,
    };
  }, [state.profile]);

  const generateDisplayName = useCallback(() => {
    if (!state.profile) return "User";

    // Try different strategies for generating display name
    if (state.profile.email) {
      const emailPart = state.profile.email.split("@")[0];
      if (emailPart && emailPart.length > 0) {
        // Capitalize first letter and handle common patterns
        const cleanName = emailPart
          .replace(/[._-]/g, " ")
          .split(" ")
          .map(
            (part) =>
              part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
          )
          .join(" ");

        return cleanName;
      }
    }

    // Fallback to user role-based name
    if (state.profile.userRole) {
      return (
        state.profile.userRole.charAt(0).toUpperCase() +
        state.profile.userRole.slice(1)
      );
    }

    return "User";
  }, [state.profile]);

  const linkAccount = useCallback(
    async (_provider: string, _credentials: Record<string, unknown>) => {
      if (!userId) throw new Error("User not authenticated");

      try {
        // This would integrate with the existing auth-service for account linking
        // Parameters are intentionally unused as this is a placeholder implementation
        // For now, we'll throw an error indicating this needs auth-service integration
        throw new Error(
          "Account linking requires auth-service integration - not implemented in user-service",
        );
      } catch (error) {
        const userServiceError: UserServiceError =
          error instanceof Error
            ? {
                type: "service",
                message: error.message,
                recoverable: false,
              }
            : {
                type: "service",
                message: "Failed to link account",
                recoverable: false,
              };

        dispatch({
          type: "PROFILE_UPDATE_ERROR",
          payload: { error: userServiceError },
        });
        throw error;
      }
    },
    [userId],
  );

  // ============================================================================
  // Enhanced Error Handling and Recovery (Task 5.3)
  // ============================================================================

  const retryFailedOperation = useCallback(
    async (operationType: "profile" | "preferences") => {
      try {
        if (operationType === "profile") {
          await fetchProfile();
        } else {
          await fetchPreferences();
        }
      } catch (error) {
        console.warn(`Retry failed for ${operationType}:`, error);
        // Error is already handled by the fetch functions
      }
    },
    [fetchProfile, fetchPreferences],
  );

  const recoverFromError = useCallback(
    async (error: UserServiceError) => {
      // Implement automatic recovery strategies based on error type
      switch (error.type) {
        case "network":
          // For network errors, try to refetch data after a delay
          if (error.recoverable) {
            setTimeout(() => {
              if (state.profileError) {
                retryFailedOperation("profile").catch(console.warn);
              }
              if (state.preferencesError) {
                retryFailedOperation("preferences").catch(console.warn);
              }
            }, 5000); // Retry after 5 seconds
          }
          break;

        case "authorization":
          // For auth errors, the auth context should handle token refresh
          // We just clear the error after a short delay to allow auth recovery
          setTimeout(() => {
            clearAllErrors();
          }, 2000);
          break;

        case "validation":
          // Validation errors require user action, no automatic recovery
          break;

        case "service":
          // For service errors, implement exponential backoff retry
          if (error.recoverable) {
            const retryDelay = error.retryAfter
              ? error.retryAfter * 1000
              : 10000;
            setTimeout(() => {
              if (state.profileError?.type === "service") {
                retryFailedOperation("profile").catch(console.warn);
              }
              if (state.preferencesError?.type === "service") {
                retryFailedOperation("preferences").catch(console.warn);
              }
            }, retryDelay);
          }
          break;

        case "timeout":
          // For timeout errors, retry with longer timeout
          if (error.recoverable) {
            setTimeout(() => {
              if (state.profileError?.type === "timeout") {
                retryFailedOperation("profile").catch(console.warn);
              }
              if (state.preferencesError?.type === "timeout") {
                retryFailedOperation("preferences").catch(console.warn);
              }
            }, 15000); // Retry after 15 seconds for timeouts
          }
          break;

        case "circuit_breaker":
          // For circuit breaker errors, wait for the specified retry time
          if (error.retryAfter) {
            setTimeout(() => {
              if (state.profileError?.type === "circuit_breaker") {
                retryFailedOperation("profile").catch(console.warn);
              }
              if (state.preferencesError?.type === "circuit_breaker") {
                retryFailedOperation("preferences").catch(console.warn);
              }
            }, error.retryAfter * 1000);
          }
          break;
      }
    },
    [
      state.profileError,
      state.preferencesError,
      retryFailedOperation,
      clearAllErrors,
    ],
  );

  // Auto-recovery effect
  useEffect(() => {
    const currentError =
      state.error || state.profileError || state.preferencesError;
    if (currentError && currentError.recoverable) {
      recoverFromError(currentError).catch(console.warn);
    }
  }, [
    state.error,
    state.profileError,
    state.preferencesError,
    recoverFromError,
  ]);

  const getErrorMessage = useCallback((error: UserServiceError): string => {
    // Generate user-friendly error messages with actionable recovery steps
    switch (error.type) {
      case "network":
        return "Connection problem. Please check your internet connection and try again.";

      case "authorization":
        return "Your session has expired. Please sign in again.";

      case "validation":
        return error.message || "Please check your input and try again.";

      case "service":
        return "Something went wrong on our end. We're working to fix it. Please try again in a few minutes.";

      case "timeout":
        return "The request is taking longer than expected. Please try again.";

      case "circuit_breaker":
        const retryMessage = error.retryAfter
          ? ` Please try again in ${error.retryAfter} seconds.`
          : " Please try again later.";
        return "The service is temporarily unavailable." + retryMessage;

      default:
        return (
          error.message || "An unexpected error occurred. Please try again."
        );
    }
  }, []);

  const getRecoveryActions = useCallback(
    (error: UserServiceError): Array<{ label: string; action: () => void }> => {
      const actions: Array<{ label: string; action: () => void }> = [];

      switch (error.type) {
        case "network":
        case "timeout":
        case "service":
          if (error.recoverable) {
            actions.push({
              label: "Try Again",
              action: () => {
                if (state.profileError) {
                  retryFailedOperation("profile").catch(console.warn);
                }
                if (state.preferencesError) {
                  retryFailedOperation("preferences").catch(console.warn);
                }
              },
            });
          }
          break;

        case "authorization":
          actions.push({
            label: "Sign In Again",
            action: () => {
              // This would trigger a redirect to login
              // Implementation depends on routing setup
              window.location.href = "/login";
            },
          });
          break;

        case "validation":
          actions.push({
            label: "Dismiss",
            action: () => clearAllErrors(),
          });
          break;

        case "circuit_breaker":
          if (!error.retryAfter || error.retryAfter < 60) {
            actions.push({
              label: "Try Again Later",
              action: () => clearAllErrors(),
            });
          }
          break;
      }

      // Always provide a dismiss option
      if (actions.length === 0 || !actions.some((a) => a.label === "Dismiss")) {
        actions.push({
          label: "Dismiss",
          action: () => clearAllErrors(),
        });
      }

      return actions;
    },
    [
      state.profileError,
      state.preferencesError,
      retryFailedOperation,
      clearAllErrors,
    ],
  );

  // ============================================================================
  // Context Value
  // ============================================================================

  const contextValue: UserContextValue = {
    // State
    state,

    // Computed properties
    profile: state.profile || (profileQuery.data as UserProfile) || null,
    preferences:
      state.preferences || (preferencesQuery.data as UserPreferences) || null,
    isLoading:
      state.isLoading || profileQuery.isLoading || preferencesQuery.isLoading,
    isUpdating:
      state.isUpdating ||
      profileUpdateMutation.isPending ||
      preferencesUpdateMutation.isPending,
    error: state.error || state.profileError || state.preferencesError,

    // Profile operations
    fetchProfile,
    updateProfile,
    refreshProfile,

    // Preferences operations
    fetchPreferences,
    updatePreferences,
    resetPreferences,

    // Validation
    validateProfile,
    validatePreferences,

    // Utility functions
    clearError,
    clearAllErrors,
    isProfileComplete,
    getDisplayName,

    // Account operations
    deactivateAccount,
    checkProfileCompleteness,
    generateDisplayName,
    linkAccount,

    // Error handling and recovery
    getErrorMessage,
    getRecoveryActions,
    retryFailedOperation,
  };

  return (
    <UserContext.Provider value={contextValue}>{children}</UserContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useUser(): UserContextValue {
  const context = useContext(UserContext);

  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }

  return context;
}
