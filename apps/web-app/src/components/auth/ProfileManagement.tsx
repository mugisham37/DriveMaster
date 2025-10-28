"use client";

/**
 * Profile Management Interface
 *
 * Comprehensive profile management with linked providers and security dashboard
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import React, { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { AuthError } from "./AuthError";
import type {
  OAuthProviderType,
  Session,
} from "@/types/auth-service";

// ============================================================================
// Component Props
// ============================================================================

export interface ProfileManagementProps {
  className?: string;
}

// ============================================================================
// Profile Management Component
// ============================================================================

export const ProfileManagement: React.FC<ProfileManagementProps> = ({
  className = "",
}) => {
  const { user, updateProfile } = useAuth();

  const [activeTab, setActiveTab] = useState<
    "profile" | "security" | "providers"
  >("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [linkedProviders, setLinkedProviders] = useState<OAuthProviderType[]>(
    []
  );
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isLoadingProviders, setIsLoadingProviders] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    handle: user?.handle || "",
    avatarUrl: user?.avatarUrl || "",
    bio: "",
    location: "",
    website: "",
    timezone:
      user?.preferences?.timezone ||
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: user?.preferences?.language || "en",
  });

  // ============================================================================
  // Data Loading
  // ============================================================================

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || "",
        email: user.email || "",
        handle: user.handle || "",
        avatarUrl: user.avatarUrl || "",
        bio: "",
        location: "",
        website: "",
        timezone:
          user.preferences?.timezone ||
          Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: user.preferences?.language || "en",
      });
    }
  }, [user]);

  const loadSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const response = await fetch("/api/auth/sessions", {
        headers: {
          Authorization: `Bearer ${await getAccessToken()}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (err) {
      console.error("Failed to load sessions:", err);
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  const loadLinkedProviders = useCallback(async () => {
    setIsLoadingProviders(true);
    try {
      const response = await fetch("/api/auth/linked-providers", {
        headers: {
          Authorization: `Bearer ${await getAccessToken()}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setLinkedProviders(data.providers || []);
      }
    } catch (err) {
      console.error("Failed to load linked providers:", err);
    } finally {
      setIsLoadingProviders(false);
    }
  }, []);

  // Helper function to get access token (would be implemented in auth context)
  const getAccessToken = async (): Promise<string> => {
    // This would be implemented to get the current access token
    return "";
  };

  useEffect(() => {
    if (activeTab === "security") {
      loadSessions();
    } else if (activeTab === "providers") {
      loadLinkedProviders();
    }
  }, [activeTab, loadSessions, loadLinkedProviders]);

  // ============================================================================
  // Form Handlers
  // ============================================================================

  const handleInputChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => {
      const { name, value } = e.target;
      setProfileForm((prev) => ({
        ...prev,
        [name]: value,
      }));

      if (error) setError(null);
      if (success) setSuccess(null);
    },
    [error, success]
  );

  const handleSaveProfile = useCallback(async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await updateProfile({
        name: profileForm.name,
        preferences: {
          theme: user?.preferences?.theme || 'system',
          emailNotifications: user?.preferences?.emailNotifications || true,
          mentorNotifications: user?.preferences?.mentorNotifications || true,
          ...(user?.preferences?.dismissedIntroducers && { dismissedIntroducers: user.preferences.dismissedIntroducers }),
          timezone: profileForm.timezone,
          language: profileForm.language,
        },
      });

      setSuccess("Profile updated successfully");
      setIsEditing(false);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update profile";
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  }, [profileForm, updateProfile, user?.preferences]);

  const handleCancelEdit = useCallback(() => {
    if (user) {
      setProfileForm({
        name: user.name || "",
        email: user.email || "",
        handle: user.handle || "",
        avatarUrl: user.avatarUrl || "",
        bio: "",
        location: "",
        website: "",
        timezone:
          user.preferences?.timezone ||
          Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: user.preferences?.language || "en",
      });
    }
    setIsEditing(false);
    setError(null);
    setSuccess(null);
  }, [user]);

  // ============================================================================
  // Session Management
  // ============================================================================

  const handleInvalidateSession = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch(`/api/auth/sessions/${sessionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${await getAccessToken()}`,
        },
      });

      if (response.ok) {
        setSessions((prev) =>
          prev.filter((session) => session.id !== sessionId)
        );
        setSuccess("Session invalidated successfully");
      } else {
        throw new Error("Failed to invalidate session");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to invalidate session"
      );
    }
  }, []);

  // ============================================================================
  // Provider Management
  // ============================================================================

  const handleUnlinkProvider = useCallback(
    async (provider: OAuthProviderType) => {
      try {
        const response = await fetch(`/api/auth/unlink-provider/${provider}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${await getAccessToken()}`,
          },
        });

        if (response.ok) {
          setLinkedProviders((prev) => prev.filter((p) => p !== provider));
          setSuccess(`${provider} account unlinked successfully`);
        } else {
          throw new Error(`Failed to unlink ${provider} account`);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : `Failed to unlink ${provider} account`
        );
      }
    },
    []
  );

  const handleLinkProvider = useCallback((provider: OAuthProviderType) => {
    // This would trigger the OAuth linking flow
    window.location.href = `/api/auth/link-provider/${provider}`;
  }, []);

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const renderTabButton = (tab: typeof activeTab, label: string) => (
    <button
      type="button"
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-2 text-sm font-medium rounded-md ${
        activeTab === tab
          ? "bg-indigo-100 text-indigo-700"
          : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
      }`}
    >
      {label}
    </button>
  );

  const renderProfileTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          Profile Information
        </h3>
        {!isEditing ? (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Edit Profile
          </button>
        ) : (
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleCancelEdit}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700"
          >
            Full Name
          </label>
          <input
            type="text"
            name="name"
            id="name"
            value={profileForm.name}
            onChange={handleInputChange}
            disabled={!isEditing}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>

        <div>
          <label
            htmlFor="handle"
            className="block text-sm font-medium text-gray-700"
          >
            Handle
          </label>
          <input
            type="text"
            name="handle"
            id="handle"
            value={profileForm.handle}
            onChange={handleInputChange}
            disabled={!isEditing}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>

        <div className="sm:col-span-2">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700"
          >
            Email Address
          </label>
          <input
            type="email"
            name="email"
            id="email"
            value={profileForm.email}
            onChange={handleInputChange}
            disabled={!isEditing}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>

        <div>
          <label
            htmlFor="timezone"
            className="block text-sm font-medium text-gray-700"
          >
            Timezone
          </label>
          <select
            name="timezone"
            id="timezone"
            value={profileForm.timezone}
            onChange={handleInputChange}
            disabled={!isEditing}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-50 disabled:text-gray-500"
          >
            <option value="UTC">UTC</option>
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
            <option value="Europe/London">London</option>
            <option value="Europe/Paris">Paris</option>
            <option value="Europe/Berlin">Berlin</option>
            <option value="Asia/Tokyo">Tokyo</option>
            <option value="Asia/Shanghai">Shanghai</option>
            <option value="Australia/Sydney">Sydney</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="language"
            className="block text-sm font-medium text-gray-700"
          >
            Language
          </label>
          <select
            name="language"
            id="language"
            value={profileForm.language}
            onChange={handleInputChange}
            disabled={!isEditing}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-50 disabled:text-gray-500"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="it">Italian</option>
            <option value="pt">Portuguese</option>
            <option value="ja">Japanese</option>
            <option value="ko">Korean</option>
            <option value="zh">Chinese</option>
          </select>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6">
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            <Image
              className="h-16 w-16 rounded-full"
              src={user?.avatarUrl || "/default-avatar.png"}
              alt={user?.name || "User avatar"}
              width={64}
              height={64}
            />
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-900">
              Profile Picture
            </h4>
            <p className="text-sm text-gray-500">
              Your profile picture is synced from your linked accounts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Active Sessions</h3>
        <p className="mt-1 text-sm text-gray-500">
          Manage your active sessions across different devices and browsers.
        </p>
      </div>

      {isLoadingSessions ? (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
          <p className="mt-2 text-sm text-gray-500">Loading sessions...</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {sessions.map((session) => (
              <li key={session.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-6 w-6 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900">
                          {session.deviceInfo}
                        </p>
                        {session.isCurrent && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center text-sm text-gray-500">
                        <p>IP: {session.ipAddress}</p>
                        <span className="mx-2">•</span>
                        <p>
                          Last active:{" "}
                          {new Date(session.lastActiveAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  {!session.isCurrent && (
                    <button
                      type="button"
                      onClick={() => handleInvalidateSession(session.id)}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-t border-gray-200 pt-6">
        <h4 className="text-base font-medium text-gray-900">
          Security Settings
        </h4>
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">
                Two-Factor Authentication
              </p>
              <p className="text-sm text-gray-500">
                Add an extra layer of security to your account
              </p>
            </div>
            <button
              type="button"
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Enable
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">
                Change Password
              </p>
              <p className="text-sm text-gray-500">
                Update your account password
              </p>
            </div>
            <Link
              href="/auth/change-password"
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Change
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

  const renderProvidersTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Linked Accounts</h3>
        <p className="mt-1 text-sm text-gray-500">
          Connect your social accounts for easier sign-in and profile
          synchronization.
        </p>
      </div>

      {isLoadingProviders ? (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
          <p className="mt-2 text-sm text-gray-500">
            Loading linked accounts...
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {(
            [
              "google",
              "github",
              "apple",
              "facebook",
              "microsoft",
            ] as OAuthProviderType[]
          ).map((provider) => {
            const isLinked = linkedProviders.includes(provider);

            return (
              <div
                key={provider}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    {/* Provider icon would go here */}
                    <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-600 uppercase">
                        {provider.charAt(0)}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {provider}
                    </p>
                    <p className="text-sm text-gray-500">
                      {isLinked ? "Connected" : "Not connected"}
                    </p>
                  </div>
                </div>

                {isLinked ? (
                  <button
                    type="button"
                    onClick={() => handleUnlinkProvider(provider)}
                    className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Disconnect
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleLinkProvider(provider)}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Connect
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ============================================================================
  // Main Render
  // ============================================================================

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please sign in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Image
                  className="h-16 w-16 rounded-full"
                  src={user.avatarUrl || "/default-avatar.png"}
                  alt={user.name || "User avatar"}
                  width={64}
                  height={64}
                />
              </div>
              <div className="ml-6">
                <h1 className="text-2xl font-bold text-gray-900">
                  {user.name}
                </h1>
                <p className="text-sm text-gray-500">@{user.handle}</p>
                <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                  <span>{user.email}</span>
                  {user.isMentor && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Mentor
                    </span>
                  )}
                  {user.isInsider && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      Insider
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow">
        <div className="px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            {renderTabButton("profile", "Profile")}
            {renderTabButton("security", "Security")}
            {renderTabButton("providers", "Linked Accounts")}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white shadow">
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          {/* Error/Success Messages */}
          <AuthError />

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-green-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.236 4.53L7.53 10.53a.75.75 0 00-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-green-700">{success}</p>
                </div>
              </div>
            </div>
          )}

          {/* Tab Content */}
          {activeTab === "profile" && renderProfileTab()}
          {activeTab === "security" && renderSecurityTab()}
          {activeTab === "providers" && renderProvidersTab()}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Exports
// ============================================================================

export default ProfileManagement;
