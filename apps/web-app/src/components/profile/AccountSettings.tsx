'use client'

/**
 * Account Settings Component
 * 
 * Implements security and privacy controls with:
 * - Account deactivation workflows
 * - Security settings management
 * - Account linking functionality
 * - Data management controls
 * - Requirements: 1.1, 1.2, 1.3, 1.4
 */

import React, { useState, useCallback } from 'react'
import { useUser } from '@/contexts/UserContext'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { 
  Loader2, 
  Shield, 
  AlertTriangle, 
  Trash2, 
  Link, 
  Unlink, 
  Key, 
  Download,
  RefreshCw
} from 'lucide-react'

export interface AccountSettingsProps {
  className?: string
}

export function AccountSettings({ className }: AccountSettingsProps) {
  const {
    profile,
    isLoading,
    isUpdating,
    error,
    deactivateAccount,
    linkAccount,
    clearError,
  } = useUser()

  const { user, logout } = useAuth()

  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false)
  const [deactivationReason, setDeactivationReason] = useState('')
  const [confirmationText, setConfirmationText] = useState('')
  const [isDeactivating, setIsDeactivating] = useState(false)

  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false)
  const [linkProvider, setLinkProvider] = useState('')
  const [isLinking, setIsLinking] = useState(false)

  const handleDeactivateAccount = useCallback(async () => {
    if (confirmationText !== 'DEACTIVATE') {
      return
    }

    try {
      setIsDeactivating(true)
      await deactivateAccount(deactivationReason)
      
      // Logout user after successful deactivation
      await logout()
    } catch (error) {
      console.error('Failed to deactivate account:', error)
    } finally {
      setIsDeactivating(false)
      setIsDeactivateDialogOpen(false)
    }
  }, [deactivationReason, confirmationText, deactivateAccount, logout])

  const handleLinkAccount = useCallback(async (provider: string) => {
    try {
      setIsLinking(true)
      // This would integrate with the auth service to link accounts
      await linkAccount(provider, {})
      setIsLinkDialogOpen(false)
    } catch (error) {
      console.error('Failed to link account:', error)
    } finally {
      setIsLinking(false)
    }
  }, [linkAccount])

  const handleExportData = useCallback(async () => {
    // This would trigger a data export request
    console.log('Exporting user data...')
  }, [])

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading account settings...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Account Settings
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
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

        {/* Account Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Account Information</h3>
          
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Account ID</Label>
                <p className="text-sm text-muted-foreground">{user?.id}</p>
              </div>
              <Badge variant="secondary">Active</Badge>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Email</Label>
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
              </div>
              <Badge variant={profile?.email ? "default" : "secondary"}>
                {profile?.email ? "Verified" : "Not Set"}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Account Created</Label>
                <p className="text-sm text-muted-foreground">
                  {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'Unknown'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* Security Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Security</h3>
          
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start">
              <Key className="h-4 w-4 mr-2" />
              Change Password
            </Button>
            
            <Button variant="outline" className="w-full justify-start">
              <Shield className="h-4 w-4 mr-2" />
              Two-Factor Authentication
            </Button>
            
            <Button variant="outline" className="w-full justify-start">
              <RefreshCw className="h-4 w-4 mr-2" />
              Active Sessions
            </Button>
          </div>
        </div>

        <Separator />

        {/* Connected Accounts */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Connected Accounts</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-600">G</span>
                </div>
                <div>
                  <p className="font-medium">Google</p>
                  <p className="text-sm text-muted-foreground">Not connected</p>
                </div>
              </div>
              <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setLinkProvider('google')}
                  >
                    <Link className="h-4 w-4 mr-2" />
                    Connect
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Connect Google Account</DialogTitle>
                    <DialogDescription>
                      This will allow you to sign in with your Google account and sync your data.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsLinkDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={() => handleLinkAccount('google')}
                      disabled={isLinking}
                    >
                      {isLinking && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Connect Account
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-white">GH</span>
                </div>
                <div>
                  <p className="font-medium">GitHub</p>
                  <p className="text-sm text-muted-foreground">Not connected</p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                <Link className="h-4 w-4 mr-2" />
                Connect
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        {/* Data Management */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Data Management</h3>
          
          <div className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={handleExportData}
            >
              <Download className="h-4 w-4 mr-2" />
              Export My Data
            </Button>
            
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You can request a copy of all your data. This may take up to 30 days to process.
              </AlertDescription>
            </Alert>
          </div>
        </div>

        <Separator />

        {/* Danger Zone */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-red-600">Danger Zone</h3>
          
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              These actions are permanent and cannot be undone. Please proceed with caution.
            </AlertDescription>
          </Alert>

          <Dialog open={isDeactivateDialogOpen} onOpenChange={setIsDeactivateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                <Trash2 className="h-4 w-4 mr-2" />
                Deactivate Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Deactivate Account</DialogTitle>
                <DialogDescription>
                  This action will permanently deactivate your account and delete all your data. 
                  This cannot be undone.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reason">Reason for deactivation (optional)</Label>
                  <Textarea
                    id="reason"
                    placeholder="Tell us why you're leaving..."
                    value={deactivationReason}
                    onChange={(e) => setDeactivationReason(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmation">
                    Type "DEACTIVATE" to confirm
                  </Label>
                  <Input
                    id="confirmation"
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value)}
                    placeholder="DEACTIVATE"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setIsDeactivateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  onClick={handleDeactivateAccount}
                  disabled={confirmationText !== 'DEACTIVATE' || isDeactivating}
                >
                  {isDeactivating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Deactivate Account
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  )
}

export default AccountSettings