'use client'

/**
 * User Profile Management Component
 * 
 * Implements comprehensive profile display and editing with:
 * - Real-time profile data from user-service integration
 * - Optimistic updates with rollback capability
 * - Validation and error handling
 * - Profile completeness tracking
 * - Requirements: 1.1, 1.2, 1.3, 1.4
 */

import React, { useState, useCallback } from 'react'
import { useUser } from '@/contexts/UserContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Loader2, Save, AlertCircle, CheckCircle, User, Mail, Globe, Clock } from 'lucide-react'
import type { UserProfile as UserProfileType } from '@/types/user-service'

export interface UserProfileProps {
  className?: string
  onProfileUpdate?: (profile: UserProfileType) => void
}

export function UserProfile({ className, onProfileUpdate }: UserProfileProps) {
  const {
    profile,
    isLoading,
    isUpdating,
    error,
    updateProfile,
    validateProfile,
    clearError,
    isProfileComplete,
    checkProfileCompleteness,
    getDisplayName,
  } = useUser()

  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<Partial<UserProfileType>>({})
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Initialize form data when profile loads
  React.useEffect(() => {
    if (profile && !isEditing) {
      setFormData({
        email: profile.email,
        timezone: profile.timezone,
        language: profile.language,
        countryCode: profile.countryCode,
      })
    }
  }, [profile, isEditing])

  const handleInputChange = useCallback((field: keyof UserProfileType, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const { [field]: _, ...rest } = prev
        return rest
      })
    }
  }, [validationErrors])

  const handleSave = useCallback(async () => {
    try {
      // Validate form data
      const errors = validateProfile(formData)
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors)
        return
      }

      // Update profile
      await updateProfile(formData)
      
      // Notify parent component
      if (onProfileUpdate && profile) {
        onProfileUpdate({ ...profile, ...formData })
      }
      
      setIsEditing(false)
      setValidationErrors({})
    } catch (error) {
      console.error('Failed to update profile:', error)
    }
  }, [formData, validateProfile, updateProfile, onProfileUpdate, profile])

  const handleCancel = useCallback(() => {
    setFormData({
      email: profile?.email || '',
      timezone: profile?.timezone || '',
      language: profile?.language || '',
      countryCode: profile?.countryCode || '',
    })
    setValidationErrors({})
    setIsEditing(false)
  }, [profile])

  const completeness = checkProfileCompleteness()
  const completionPercentage = completeness.isComplete ? 100 : 
    Math.round(((4 - completeness.missingFields.length) / 4) * 100)

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading profile...</span>
        </CardContent>
      </Card>
    )
  }

  if (!profile) {
    return (
      <Card className={className}>
        <CardContent className="p-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No profile data available. Please try refreshing the page.
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
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={completeness.isComplete ? "default" : "secondary"}>
              {completionPercentage}% Complete
            </Badge>
            {!isEditing && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                Edit Profile
              </Button>
            )}
          </div>
        </div>
        
        {!completeness.isComplete && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Profile Completion</span>
              <span>{completionPercentage}%</span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
            <p className="text-sm text-muted-foreground">
              Missing: {completeness.missingFields.join(', ')}
            </p>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
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

        <div className="grid gap-4 md:grid-cols-2">
          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Address
            </Label>
            {isEditing ? (
              <div className="space-y-1">
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={validationErrors.email ? 'border-red-500' : ''}
                />
                {validationErrors.email && (
                  <p className="text-sm text-red-500">{validationErrors.email}</p>
                )}
              </div>
            ) : (
              <p className="text-sm font-medium">{profile.email || 'Not set'}</p>
            )}
          </div>

          {/* Display Name */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Display Name
            </Label>
            <p className="text-sm font-medium">{getDisplayName()}</p>
          </div>

          {/* Timezone */}
          <div className="space-y-2">
            <Label htmlFor="timezone" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Timezone
            </Label>
            {isEditing ? (
              <div className="space-y-1">
                <Select
                  value={formData.timezone || ''}
                  onValueChange={(value) => handleInputChange('timezone', value)}
                >
                  <SelectTrigger className={validationErrors.timezone ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">Eastern Time</SelectItem>
                    <SelectItem value="America/Chicago">Central Time</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                    <SelectItem value="Europe/London">London</SelectItem>
                    <SelectItem value="Europe/Paris">Paris</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                    <SelectItem value="Asia/Shanghai">Shanghai</SelectItem>
                    <SelectItem value="Australia/Sydney">Sydney</SelectItem>
                  </SelectContent>
                </Select>
                {validationErrors.timezone && (
                  <p className="text-sm text-red-500">{validationErrors.timezone}</p>
                )}
              </div>
            ) : (
              <p className="text-sm font-medium">{profile.timezone || 'Not set'}</p>
            )}
          </div>

          {/* Language */}
          <div className="space-y-2">
            <Label htmlFor="language" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Language
            </Label>
            {isEditing ? (
              <div className="space-y-1">
                <Select
                  value={formData.language || ''}
                  onValueChange={(value) => handleInputChange('language', value)}
                >
                  <SelectTrigger className={validationErrors.language ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="it">Italian</SelectItem>
                    <SelectItem value="pt">Portuguese</SelectItem>
                    <SelectItem value="ja">Japanese</SelectItem>
                    <SelectItem value="ko">Korean</SelectItem>
                    <SelectItem value="zh">Chinese</SelectItem>
                  </SelectContent>
                </Select>
                {validationErrors.language && (
                  <p className="text-sm text-red-500">{validationErrors.language}</p>
                )}
              </div>
            ) : (
              <p className="text-sm font-medium">{profile.language || 'Not set'}</p>
            )}
          </div>

          {/* Country */}
          <div className="space-y-2">
            <Label htmlFor="countryCode" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Country
            </Label>
            {isEditing ? (
              <div className="space-y-1">
                <Select
                  value={formData.countryCode || ''}
                  onValueChange={(value) => handleInputChange('countryCode', value)}
                >
                  <SelectTrigger className={validationErrors.countryCode ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">United States</SelectItem>
                    <SelectItem value="CA">Canada</SelectItem>
                    <SelectItem value="GB">United Kingdom</SelectItem>
                    <SelectItem value="DE">Germany</SelectItem>
                    <SelectItem value="FR">France</SelectItem>
                    <SelectItem value="ES">Spain</SelectItem>
                    <SelectItem value="IT">Italy</SelectItem>
                    <SelectItem value="JP">Japan</SelectItem>
                    <SelectItem value="KR">South Korea</SelectItem>
                    <SelectItem value="CN">China</SelectItem>
                    <SelectItem value="AU">Australia</SelectItem>
                    <SelectItem value="BR">Brazil</SelectItem>
                  </SelectContent>
                </Select>
                {validationErrors.countryCode && (
                  <p className="text-sm text-red-500">{validationErrors.countryCode}</p>
                )}
              </div>
            ) : (
              <p className="text-sm font-medium">{profile.countryCode || 'Not set'}</p>
            )}
          </div>

          {/* Profile Version */}
          <div className="space-y-2">
            <Label>Profile Version</Label>
            <p className="text-sm text-muted-foreground">v{profile.version}</p>
          </div>
        </div>

        {isEditing && (
          <div className="flex gap-2 pt-4 border-t">
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
            <Button 
              variant="outline" 
              onClick={handleCancel}
              disabled={isUpdating}
            >
              Cancel
            </Button>
          </div>
        )}

        {completeness.isComplete && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Your profile is complete! This helps us provide you with a better experience.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

export default UserProfile