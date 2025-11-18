'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { NotificationPreferencesPanel } from '@/components/notifications/organisms/NotificationPreferencesPanel';
import { DeviceTokenManager } from '@/components/notifications/organisms/DeviceTokenManager';
import { NotificationScheduler } from '@/components/notifications/organisms/NotificationScheduler';
import { NotificationTemplateManager } from '@/components/notifications/organisms/NotificationTemplateManager';
import { 
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { 
  Settings, 
  Save, 
  RotateCcw, 
  Download, 
  Upload,
  Bell,
  Smartphone,
  Calendar,
  FileText,
  CheckCircle2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function NotificationSettingsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('preferences');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Sync tab with URL hash
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash && ['preferences', 'devices', 'schedule', 'templates'].includes(hash)) {
      setActiveTab(hash);
    }
  }, []);

  useEffect(() => {
    // Check if user is admin (replace with actual auth check)
    const checkAdminStatus = async () => {
      // TODO: Replace with actual admin check
      setIsAdmin(false);
    };
    checkAdminStatus();
  }, []);

  const handleTabChange = useCallback((value: string) => {
    if (hasUnsavedChanges) {
      const confirmed = confirm('You have unsaved changes. Do you want to leave this tab?');
      if (!confirmed) return;
    }
    setActiveTab(value);
    window.location.hash = value;
    setHasUnsavedChanges(false);
  }, [hasUnsavedChanges]);

  const handleSave = useCallback(() => {
    setLastSaved(new Date());
    setHasUnsavedChanges(false);
    toast({
      title: 'Settings saved',
      description: 'Your notification settings have been updated successfully.',
      duration: 3000,
    });
  }, [toast]);

  const handleReset = useCallback(() => {
    if (confirm('Are you sure you want to reset all settings to default?')) {
      setHasUnsavedChanges(false);
      toast({
        title: 'Settings reset',
        description: 'Your notification settings have been reset to default.',
        duration: 3000,
      });
    }
  }, [toast]);

  const handleExport = useCallback(() => {
    // TODO: Implement export functionality
    const settings = {
      preferences: {},
      devices: {},
      schedule: {},
      exportedAt: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `notification-settings-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Settings exported',
      description: 'Your settings have been downloaded.',
      duration: 3000,
    });
  }, [toast]);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const settings = JSON.parse(text);
        
        // TODO: Validate and apply imported settings
        
        toast({
          title: 'Settings imported',
          description: 'Your settings have been imported successfully.',
          duration: 3000,
        });
        setHasUnsavedChanges(true);
      } catch (error) {
        toast({
          title: 'Import failed',
          description: 'Failed to import settings. Please check the file format.',
          variant: 'destructive',
          duration: 3000,
        });
      }
    };
    input.click();
  }, [toast]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      {/* Breadcrumb Navigation */}
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/settings">Settings</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Notifications</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Notification Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage your notification preferences and devices
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {lastSaved && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Saved {lastSaved.toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Unsaved Changes Alert */}
      {hasUnsavedChanges && (
        <Alert className="mb-4">
          <AlertDescription>
            You have unsaved changes. Don't forget to save before leaving.
          </AlertDescription>
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <Button onClick={handleSave} disabled={!hasUnsavedChanges}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset to Default
        </Button>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export Settings
        </Button>
        <Button variant="outline" onClick={handleImport}>
          <Upload className="h-4 w-4 mr-2" />
          Import Settings
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Preferences</span>
          </TabsTrigger>
          <TabsTrigger value="devices" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            <span className="hidden sm:inline">Devices</span>
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Schedule</span>
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Templates</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Configure which notifications you want to receive and through which channels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NotificationPreferencesPanel
                userId="current-user"
                onSave={() => {
                  handleSave();
                  setHasUnsavedChanges(false);
                }}
                showAdvanced
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Device Management</CardTitle>
              <CardDescription>
                Manage devices that can receive push notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DeviceTokenManager
                userId="current-user"
                onTokenRegistered={() => {
                  toast({
                    title: 'Device registered',
                    description: 'This device can now receive push notifications.',
                    duration: 3000,
                  });
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Scheduled Notifications</CardTitle>
              <CardDescription>
                View and manage your scheduled notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <NotificationScheduler
                userId="current-user"
                view="list"
                editable
              />
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="templates" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Notification Templates</CardTitle>
                <CardDescription>
                  Create and manage notification templates (Admin only)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <NotificationTemplateManager
                  onSave={() => {
                    toast({
                      title: 'Template saved',
                      description: 'The notification template has been saved.',
                      duration: 3000,
                    });
                  }}
                  onDelete={() => {
                    toast({
                      title: 'Template deleted',
                      description: 'The notification template has been deleted.',
                      duration: 3000,
                    });
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Keyboard Shortcuts Help */}
      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>
          Press <kbd className="px-2 py-1 bg-muted rounded">Ctrl/Cmd + S</kbd> to save
        </p>
      </div>
    </div>
  );
}
