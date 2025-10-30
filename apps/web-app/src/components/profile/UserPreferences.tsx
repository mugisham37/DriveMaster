'use client'

/**
 * User Preferences Management Component
 * 
 * Implements categorized preference management with:
 * - Theme, notification, privacy, and learning preferences
 * - Real-time updates with optimistic UI
 * - Validation and error handling
 * - Accessibility settings
 * - Requirements: 1.1, 1.2, 1.3, 1.4
 */

import React, { useState, useCallback } from 'react'
import { useUser } from '@/contexts/UserContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Loader2, Save, AlertCircle, Settings, Bell, Shield, BookOpen, Eye } from 'lucide-react'
import type { PreferencesData } from '@/types/user-service'

export interface UserPreferencesProps {
  className?: string
  onPreferencesUpdate?: (preferences: PreferencesData) => void
}

export function UserPreferences({ className, onPreferencesUpdate }: UserPreferencesProps) {
  const {
    preferences,
    isLoading,
    isUpdating,
    error,
    updatePreferences,
    validatePreferences,
    resetPreferences,
    clearError,
  } = useUser()

  const [formData, setFormData] = useState<Partial<PreferencesData>>({})
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [hasChanges, setHasChanges] = useState(false)

  // Initialize form data when preferences load
  React.useEffect(() => {
    if (preferences?.preferences) {
      setFormData(preferences.preferences)
      setHasChanges(false)
    }
  }, [preferences])

  const handlePreferenceChange = useCallback((
    category: keyof PreferencesData,
    field: string,
    value: any
  ) => {
    setFormData(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value,
      },
    }))
    setHasChanges(true)
    
    // Clear validation error for this field
    const errorKey = `${category}.${field}`
    if (validationErrors[errorKey]) {
      setValidationErrors(prev => {
        const { [errorKey]: _, ...rest } = prev
        return rest
      })
    }
  }, [validationErrors])

  const handleSave = useCallback(async () => {
    try {
      // Validate form data
      const errors = validatePreferences(formData)
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors)
        return
      }

      // Update preferences
      await updatePreferences(formData)
      
      // Notify parent component
      if (onPreferencesUpdate) {
        onPreferencesUpdate(formData as PreferencesData)
      }
      
      setValidationErrors({})
      setHasChanges(false)
    } catch (error) {
      console.error('Failed to update preferences:', error)
    }
  }, [formData, validatePreferences, updatePreferences, onPreferencesUpdate])

  const handleReset = useCallback(async () => {
    try {
      await resetPreferences()
      setHasChanges(false)
    } catch (error) {
      console.error('Failed to reset preferences:', error)
    }
  }, [resetPreferences])

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading preferences...</span>
        </CardContent>
      </Card>
    )
  }

  if (!preferences?.preferences) {
    return (
      <Card className={className}>
        <CardContent className="p-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No preferences data available. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Preferences
          </CardTitle>
          <div className="flex gap-2">
            {hasChanges && (
              <Button 
                onClick={handleSave} 
                disabled={isUpdating}
                className="flex items-center gap-2"
              >
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Changes
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={handleReset}
              disabled={isUpdating}
            >
              Reset to Defaults
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error.message}
              <Button 
                variant="ghost" 
                size="sm" 
                className="ml-2"
                onClick={() => clearError()}
              >
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
            <TabsTrigger value="learning">Learning</TabsTrigger>
            <TabsTrigger value="accessibility">Accessibility</TabsTrigger>
          </TabsList>

          {/* General Preferences */}
          <TabsContent value="general" className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">General Settings</h3>
              
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="theme">Theme</Label>
                  <Select
                    value={formData.theme || 'system'}
                    onValueChange={(value) => handlePreferenceChange('theme', 'theme', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                  {validationErrors.theme && (
                    <p className="text-sm text-red-500">{validationErrors.theme}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select
                    value={formData.language || 'en'}
                    onValueChange={(value) => handlePreferenceChange('language', 'language', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="ja">Japanese</SelectItem>
                    </SelectContent>
                  </Select>
                  {validationErrors.language && (
                    <p className="text-sm text-red-500">{validationErrors.language}</p>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Notification Preferences */}
          <TabsContent value="notifications" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                <h3 className="text-lg font-medium">Notification Settings</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch
                    checked={formData.notifications?.email ?? true}
                    onCheckedChange={(checked) => 
                      handlePreferenceChange('notifications', 'email', checked)
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive push notifications in your browser
                    </p>
                  </div>
                  <Switch
                    checked={formData.notifications?.push ?? true}
                    onCheckedChange={(checked) => 
                      handlePreferenceChange('notifications', 'push', checked)
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>In-App Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Show notifications within the application
                    </p>
                  </div>
                  <Switch
                    checked={formData.notifications?.inApp ?? true}
                    onCheckedChange={(checked) => 
                      handlePreferenceChange('notifications', 'inApp', checked)
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Marketing Communications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive updates about new features and promotions
                    </p>
                  </div>
                  <Switch
                    checked={formData.notifications?.marketing ?? false}
                    onCheckedChange={(checked) => 
                      handlePreferenceChange('notifications', 'marketing', checked)
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Learning Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Get reminded to continue your learning journey
                    </p>
                  </div>
                  <Switch
                    checked={formData.notifications?.reminders ?? true}
                    onCheckedChange={(checked) => 
                      handlePreferenceChange('notifications', 'reminders', checked)
                    }
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Privacy Preferences */}
          <TabsContent value="privacy" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                <h3 className="text-lg font-medium">Privacy Settings</h3>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Profile Visibility</Label>
                  <Select
                    value={formData.privacy?.profileVisibility || 'public'}
                    onValueChange={(value) => 
                      handlePreferenceChange('privacy', 'profileVisibility', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="friends">Friends Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Activity Tracking</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow tracking of your learning activities
                    </p>
                  </div>
                  <Switch
                    checked={formData.privacy?.activityTracking ?? true}
                    onCheckedChange={(checked) => 
                      handlePreferenceChange('privacy', 'activityTracking', checked)
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Data Sharing</Label>
                    <p className="text-sm text-muted-foreground">
                      Share anonymized data to improve the platform
                    </p>
                  </div>
                  <Switch
                    checked={formData.privacy?.dataSharing ?? false}
                    onCheckedChange={(checked) => 
                      handlePreferenceChange('privacy', 'dataSharing', checked)
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Analytics</Label>
                    <p className="text-sm text-muted-foreground">
                      Help us improve by sharing usage analytics
                    </p>
                  </div>
                  <Switch
                    checked={formData.privacy?.analytics ?? true}
                    onCheckedChange={(checked) => 
                      handlePreferenceChange('privacy', 'analytics', checked)
                    }
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Learning Preferences */}
          <TabsContent value="learning" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                <h3 className="text-lg font-medium">Learning Settings</h3>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Difficulty Level</Label>
                  <Select
                    value={formData.learning?.difficulty || 'intermediate'}
                    onValueChange={(value) => 
                      handlePreferenceChange('learning', 'difficulty', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Learning Pace</Label>
                  <Select
                    value={formData.learning?.pace || 'normal'}
                    onValueChange={(value) => 
                      handlePreferenceChange('learning', 'pace', value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="slow">Slow</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="fast">Fast</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Learning Reminders</Label>
                    <p className="text-sm text-muted-foreground">
                      Get reminded to practice regularly
                    </p>
                  </div>
                  <Switch
                    checked={formData.learning?.reminders ?? true}
                    onCheckedChange={(checked) => 
                      handlePreferenceChange('learning', 'reminders', checked)
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Streak Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Get notified about your learning streaks
                    </p>
                  </div>
                  <Switch
                    checked={formData.learning?.streakNotifications ?? true}
                    onCheckedChange={(checked) => 
                      handlePreferenceChange('learning', 'streakNotifications', checked)
                    }
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Accessibility Preferences */}
          <TabsContent value="accessibility" className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                <h3 className="text-lg font-medium">Accessibility Settings</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>High Contrast</Label>
                    <p className="text-sm text-muted-foreground">
                      Use high contrast colors for better visibility
                    </p>
                  </div>
                  <Switch
                    checked={formData.accessibility?.highContrast ?? false}
                    onCheckedChange={(checked) => 
                      handlePreferenceChange('accessibility', 'highContrast', checked)
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Large Text</Label>
                    <p className="text-sm text-muted-foreground">
                      Use larger text sizes for better readability
                    </p>
                  </div>
                  <Switch
                    checked={formData.accessibility?.largeText ?? false}
                    onCheckedChange={(checked) => 
                      handlePreferenceChange('accessibility', 'largeText', checked)
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Reduced Motion</Label>
                    <p className="text-sm text-muted-foreground">
                      Reduce animations and motion effects
                    </p>
                  </div>
                  <Switch
                    checked={formData.accessibility?.reducedMotion ?? false}
                    onCheckedChange={(checked) => 
                      handlePreferenceChange('accessibility', 'reducedMotion', checked)
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Screen Reader Support</Label>
                    <p className="text-sm text-muted-foreground">
                      Optimize interface for screen readers
                    </p>
                  </div>
                  <Switch
                    checked={formData.accessibility?.screenReader ?? false}
                    onCheckedChange={(checked) => 
                      handlePreferenceChange('accessibility', 'screenReader', checked)
                    }
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

export default UserPreferences