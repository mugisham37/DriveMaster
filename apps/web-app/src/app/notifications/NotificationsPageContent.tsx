'use client';

import { useState, useCallback } from 'react';
import { NotificationList } from '@/components/notifications/organisms/NotificationList';
import { NotificationFilterBar } from '@/components/notifications/molecules/NotificationFilterBar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNotificationCounts } from '@/hooks/notifications/useNotificationCounts';
import { useNotificationMutations } from '@/hooks/notifications/useNotificationMutations';
import { NotificationQueryParams } from '@/types/notifications';
import { 
  LayoutGrid, 
  LayoutList, 
  CheckCheck, 
  Trash2, 
  Settings, 
  RefreshCw,
  TrendingUp,
  Bell
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import Link from 'next/link';

export function NotificationsPageContent() {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [filters, setFilters] = useState<NotificationQueryParams>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const { data: counts } = useNotificationCounts();
  const { markAsRead, deleteNotification } = useNotificationMutations();

  const handleMarkAllRead = useCallback(async () => {
    if (selectedIds.length > 0) {
      await Promise.all(selectedIds.map(id => markAsRead.mutateAsync(id)));
      setSelectedIds([]);
    }
  }, [selectedIds, markAsRead]);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedIds.length > 0 && confirm(`Delete ${selectedIds.length} notification(s)?`)) {
      await Promise.all(selectedIds.map(id => deleteNotification.mutateAsync(id)));
      setSelectedIds([]);
    }
  }, [selectedIds, deleteNotification]);

  const handleRefresh = useCallback(() => {
    window.location.reload();
  }, []);

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Breadcrumb Navigation */}
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
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
          <Bell className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
            {counts && (
              <p className="text-sm text-muted-foreground mt-1">
                {counts.unread} unread of {counts.total} total
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle */}
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-r-none"
            >
              <LayoutList className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-l-none"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>

          <Button variant="outline" size="sm" asChild>
            <Link href="/settings/notifications">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Link>
          </Button>
        </div>
      </div>

      {/* Bulk Actions Toolbar */}
      {selectedIds.length > 0 && (
        <Card className="mb-4 border-primary">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {selectedIds.length} notification(s) selected
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarkAllRead}
                  disabled={markAsRead.isPending}
                >
                  <CheckCheck className="h-4 w-4 mr-2" />
                  Mark as Read
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteSelected}
                  disabled={deleteNotification.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedIds([])}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-3">
          <NotificationList
            userId="current-user"
            initialFilters={filters}
            groupBy="date"
            enableRealtime
            className={viewMode === 'grid' ? 'grid-view' : ''}
          />
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-1 space-y-4">
          {/* Filter Bar */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <NotificationFilterBar
                filters={filters}
                onFilterChange={setFilters}
                availableTypes={[
                  'achievement',
                  'streak_reminder',
                  'spaced_repetition',
                  'mock_test_reminder',
                  'system',
                  'mentoring',
                  'course_update',
                ]}
                showSearch
              />
            </CardContent>
          </Card>

          {/* Statistics Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Today</span>
                  <Badge variant="secondary">{counts?.today || 0}</Badge>
                </div>
                <Separator />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">This Week</span>
                  <Badge variant="secondary">{counts?.thisWeek || 0}</Badge>
                </div>
                <Separator />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Unread</span>
                  <Badge variant="default">{counts?.unread || 0}</Badge>
                </div>
                <Separator />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <Badge variant="outline">{counts?.total || 0}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
                <Link href="/settings/notifications">
                  <Settings className="h-4 w-4 mr-2" />
                  Notification Settings
                </Link>
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
                <Link href="/settings/notifications#schedule">
                  <Bell className="h-4 w-4 mr-2" />
                  Scheduled Notifications
                </Link>
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>
          Press <kbd className="px-2 py-1 bg-muted rounded">?</kbd> for keyboard shortcuts
        </p>
      </div>
    </div>
  );
}
