'use client';

import React, { useState, useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Calendar as CalendarIcon, List, Clock, Repeat, Trash2, Edit, Filter } from 'lucide-react';
import { format, isSameDay, startOfDay, parseISO } from 'date-fns';
import { useScheduledNotifications } from '@/hooks/useScheduledNotifications';
import { NotificationTypeIcon } from '../molecules/NotificationTypeIcon';
import { NotificationSkeleton } from '../molecules/NotificationSkeleton';
import { EmptyNotificationState } from '../molecules/EmptyNotificationState';
import type { ScheduledNotification, NotificationType } from '@/types/notifications';

interface NotificationSchedulerProps {
  userId: string;
  view?: 'list' | 'calendar';
  editable?: boolean;
  className?: string;
}

export function NotificationScheduler({
  userId,
  view: initialView = 'list',
  editable = true,
  className = '',
}: NotificationSchedulerProps) {
  const [view, setView] = useState<'list' | 'calendar'>(initialView);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [filterType, setFilterType] = useState<NotificationType | 'all'>('all');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<ScheduledNotification | null>(null);
  const [newScheduledTime, setNewScheduledTime] = useState('');
  const [newScheduledDate, setNewScheduledDate] = useState<Date | undefined>();
  const [cancelMode, setCancelMode] = useState<'single' | 'series'>('single');

  const {
    scheduledNotifications,
    isLoading,
    error,
    cancelScheduledNotification,
    rescheduleNotification,
  } = useScheduledNotifications(userId);

  // Filter notifications by type
  const filteredNotifications = useMemo(() => {
    if (!scheduledNotifications) return [];
    if (filterType === 'all') return scheduledNotifications;
    return scheduledNotifications.filter((n) => n.notification.type === filterType);
  }, [scheduledNotifications, filterType]);

  // Group notifications by date for list view
  const groupedNotifications = useMemo(() => {
    const groups: Record<string, ScheduledNotification[]> = {
      Today: [],
      Tomorrow: [],
      'This Week': [],
      'Next Week': [],
      Later: [],
    };

    const now = startOfDay(new Date());
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const thisWeekEnd = new Date(now);
    thisWeekEnd.setDate(thisWeekEnd.getDate() + 7);
    const nextWeekEnd = new Date(now);
    nextWeekEnd.setDate(nextWeekEnd.getDate() + 14);

    filteredNotifications.forEach((notification) => {
      const scheduledDate = startOfDay(new Date(notification.scheduledFor));
      
      if (isSameDay(scheduledDate, now)) {
        groups.Today.push(notification);
      } else if (isSameDay(scheduledDate, tomorrow)) {
        groups.Tomorrow.push(notification);
      } else if (scheduledDate < thisWeekEnd) {
        groups['This Week'].push(notification);
      } else if (scheduledDate < nextWeekEnd) {
        groups['Next Week'].push(notification);
      } else {
        groups.Later.push(notification);
      }
    });

    return groups;
  }, [filteredNotifications]);

  // Get notifications for selected date in calendar view
  const notificationsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return filteredNotifications.filter((n) =>
      isSameDay(new Date(n.scheduledFor), selectedDate)
    );
  }, [filteredNotifications, selectedDate]);

  // Get dates with scheduled notifications for calendar
  const datesWithNotifications = useMemo(() => {
    return filteredNotifications.map((n) => startOfDay(new Date(n.scheduledFor)));
  }, [filteredNotifications]);

  const handleCancelClick = (notification: ScheduledNotification) => {
    setSelectedNotification(notification);
    setCancelMode(notification.isRecurring ? 'single' : 'single');
    setCancelDialogOpen(true);
  };

  const handleRescheduleClick = (notification: ScheduledNotification) => {
    setSelectedNotification(notification);
    setNewScheduledDate(new Date(notification.scheduledFor));
    setNewScheduledTime(format(new Date(notification.scheduledFor), 'HH:mm'));
    setRescheduleDialogOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!selectedNotification) return;

    try {
      await cancelScheduledNotification(selectedNotification.id, cancelMode);
      setCancelDialogOpen(false);
      setSelectedNotification(null);
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  };

  const handleRescheduleConfirm = async () => {
    if (!selectedNotification || !newScheduledDate || !newScheduledTime) return;

    try {
      const [hours, minutes] = newScheduledTime.split(':').map(Number);
      const newDate = new Date(newScheduledDate);
      newDate.setHours(hours, minutes, 0, 0);

      await rescheduleNotification(selectedNotification.id, newDate);
      setRescheduleDialogOpen(false);
      setSelectedNotification(null);
    } catch (error) {
      console.error('Failed to reschedule notification:', error);
    }
  };

  const renderNotificationItem = (notification: ScheduledNotification) => (
    <Card key={notification.id} className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <NotificationTypeIcon type={notification.notification.type} size="md" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-sm truncate">
                  {notification.notification.title}
                </h4>
                {notification.isRecurring && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Repeat className="h-3 w-3" />
                    Recurring
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {notification.notification.body}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{format(new Date(notification.scheduledFor), 'PPp')}</span>
                {notification.timezone && (
                  <Badge variant="secondary" className="text-xs">
                    {notification.timezone}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {editable && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRescheduleClick(notification)}
                aria-label="Reschedule notification"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCancelClick(notification)}
                aria-label="Cancel notification"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className={className}>
        <NotificationSkeleton count={5} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <EmptyNotificationState type="error" onAction={() => window.location.reload()} />
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header with view toggle and filters */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Tabs value={view} onValueChange={(v) => setView(v as 'list' | 'calendar')}>
            <TabsList>
              <TabsTrigger value="list" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                List
              </TabsTrigger>
              <TabsTrigger value="calendar" className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Calendar
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterType} onValueChange={(v) => setFilterType(v as NotificationType | 'all')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="achievement">Achievement</SelectItem>
              <SelectItem value="streak_reminder">Streak Reminder</SelectItem>
              <SelectItem value="spaced_repetition">Spaced Repetition</SelectItem>
              <SelectItem value="mock_test_reminder">Mock Test</SelectItem>
              <SelectItem value="system">System</SelectItem>
              <SelectItem value="mentoring">Mentoring</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* List View */}
      {view === 'list' && (
        <div>
          {filteredNotifications.length === 0 ? (
            <EmptyNotificationState type="filtered-empty" onAction={() => setFilterType('all')} />
          ) : (
            Object.entries(groupedNotifications).map(([group, notifications]) =>
              notifications.length > 0 ? (
                <div key={group} className="mb-6">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    {group}
                    <Badge variant="secondary">{notifications.length}</Badge>
                  </h3>
                  {notifications.map(renderNotificationItem)}
                </div>
              ) : null
            )
          )}
        </div>
      )}

      {/* Calendar View */}
      {view === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Select Date</CardTitle>
              <CardDescription>View scheduled notifications by date</CardDescription>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                modifiers={{
                  hasNotifications: datesWithNotifications,
                }}
                modifiersStyles={{
                  hasNotifications: {
                    fontWeight: 'bold',
                    textDecoration: 'underline',
                  },
                }}
                className="rounded-md border"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : 'Select a date'}
              </CardTitle>
              <CardDescription>
                {notificationsForSelectedDate.length} notification(s) scheduled
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {notificationsForSelectedDate.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    No notifications scheduled for this date
                  </div>
                ) : (
                  notificationsForSelectedDate.map(renderNotificationItem)
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cancel Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Scheduled Notification</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedNotification?.isRecurring ? (
                <div className="space-y-4">
                  <p>This is a recurring notification. What would you like to cancel?</p>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="cancelMode"
                        value="single"
                        checked={cancelMode === 'single'}
                        onChange={(e) => setCancelMode(e.target.value as 'single' | 'series')}
                      />
                      Only this occurrence
                    </Label>
                    <Label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="cancelMode"
                        value="series"
                        checked={cancelMode === 'series'}
                        onChange={(e) => setCancelMode(e.target.value as 'single' | 'series')}
                      />
                      Entire series
                    </Label>
                  </div>
                </div>
              ) : (
                <p>
                  Are you sure you want to cancel this scheduled notification? This action cannot be
                  undone.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelConfirm}>Cancel Notification</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Notification</DialogTitle>
            <DialogDescription>
              Choose a new date and time for this notification
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newScheduledDate ? format(newScheduledDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={newScheduledDate}
                    onSelect={setNewScheduledDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={newScheduledTime}
                onChange={(e) => setNewScheduledTime(e.target.value)}
              />
            </div>
            {selectedNotification?.timezone && (
              <div className="text-sm text-muted-foreground">
                Timezone: {selectedNotification.timezone}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRescheduleConfirm}>Reschedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
