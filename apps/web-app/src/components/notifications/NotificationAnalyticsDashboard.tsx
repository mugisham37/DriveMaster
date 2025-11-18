'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  TrendingUp, 
  TrendingDown, 
  Download, 
  Calendar as CalendarIcon,
  BarChart3,
  PieChart,
  Activity,
  Users,
  Mail,
  Bell,
  MessageSquare,
  Smartphone
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { useNotificationAnalytics } from '@/hooks/useNotificationAnalytics';
import { NotificationSkeleton } from './molecules/NotificationSkeleton';
import { EmptyNotificationState } from './molecules/EmptyNotificationState';
import type { DateRange } from 'react-day-picker';

export interface NotificationAnalyticsDashboardProps {
  userId?: string;
  dateRange?: { start: Date; end: Date };
  groupBy?: 'hour' | 'day' | 'week' | 'month';
  className?: string;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  description?: string;
}

function MetricCard({ title, value, change, icon, description }: MetricCardProps) {
  const isPositive = change !== undefined && change >= 0;
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            {isPositive ? (
              <TrendingUp className="h-3 w-3 text-green-500" />
            ) : (
              <TrendingDown className="h-3 w-3 text-red-500" />
            )}
            <span className={isPositive ? 'text-green-500' : 'text-red-500'}>
              {Math.abs(change)}%
            </span>
            <span>from last period</span>
          </div>
        )}
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function NotificationAnalyticsDashboard({
  userId,
  dateRange: initialDateRange,
  groupBy: initialGroupBy = 'day',
  className = '',
}: NotificationAnalyticsDashboardProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: initialDateRange?.start || subDays(new Date(), 30),
    to: initialDateRange?.end || new Date(),
  });
  const [groupBy, setGroupBy] = useState(initialGroupBy);
  const [selectedTab, setSelectedTab] = useState('overview');

  const {
    analytics,
    deliveryMetrics,
    engagementMetrics,
    abTestResults,
    typeBreakdown,
    channelPerformance,
    isLoading,
    error,
    exportReport,
  } = useNotificationAnalytics({
    userId,
    startDate: dateRange?.from,
    endDate: dateRange?.to,
    groupBy,
  });

  // Calculate key metrics
  const keyMetrics = useMemo(() => {
    if (!analytics) return null;

    const totalSent = analytics.totalSent || 0;
    const totalDelivered = analytics.totalDelivered || 0;
    const totalOpened = analytics.totalOpened || 0;
    const totalClicked = analytics.totalClicked || 0;

    return {
      deliveryRate: totalSent > 0 ? ((totalDelivered / totalSent) * 100).toFixed(1) : '0',
      openRate: totalDelivered > 0 ? ((totalOpened / totalDelivered) * 100).toFixed(1) : '0',
      clickRate: totalOpened > 0 ? ((totalClicked / totalOpened) * 100).toFixed(1) : '0',
      engagementScore: analytics.engagementScore?.toFixed(1) || '0',
    };
  }, [analytics]);

  const handleExport = async (format: 'csv' | 'pdf') => {
    try {
      await exportReport(format, {
        startDate: dateRange?.from,
        endDate: dateRange?.to,
      });
    } catch (error) {
      console.error('Failed to export report:', error);
    }
  };

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range);
  };

  const applyPreset = (preset: 'today' | 'week' | 'month' | 'quarter') => {
    const now = new Date();
    let from: Date;

    switch (preset) {
      case 'today':
        from = startOfDay(now);
        break;
      case 'week':
        from = subDays(now, 7);
        break;
      case 'month':
        from = subDays(now, 30);
        break;
      case 'quarter':
        from = subDays(now, 90);
        break;
    }

    setDateRange({ from, to: endOfDay(now) });
  };

  if (isLoading) {
    return (
      <div className={className}>
        <NotificationSkeleton count={4} />
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
      {/* Header with filters and export */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold">Notification Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Track delivery, engagement, and performance metrics
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Date Range Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, 'LLL dd, y')} - {format(dateRange.to, 'LLL dd, y')}
                    </>
                  ) : (
                    format(dateRange.from, 'LLL dd, y')
                  )
                ) : (
                  'Pick a date range'
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="p-3 border-b">
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => applyPreset('today')}>
                    Today
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => applyPreset('week')}>
                    7 Days
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => applyPreset('month')}>
                    30 Days
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => applyPreset('quarter')}>
                    90 Days
                  </Button>
                </div>
              </div>
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={handleDateRangeSelect}
                numberOfMonths={2}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Group By */}
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as typeof groupBy)}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hour">Hourly</SelectItem>
              <SelectItem value="day">Daily</SelectItem>
              <SelectItem value="week">Weekly</SelectItem>
              <SelectItem value="month">Monthly</SelectItem>
            </SelectContent>
          </Select>

          {/* Export */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-40" align="end">
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => handleExport('csv')}
                >
                  Export as CSV
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => handleExport('pdf')}
                >
                  Export as PDF
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Key Metrics Cards */}
      {keyMetrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <MetricCard
            title="Delivery Rate"
            value={`${keyMetrics.deliveryRate}%`}
            change={analytics?.deliveryRateChange}
            icon={<Mail className="h-4 w-4 text-muted-foreground" />}
            description="Successfully delivered"
          />
          <MetricCard
            title="Open Rate"
            value={`${keyMetrics.openRate}%`}
            change={analytics?.openRateChange}
            icon={<Bell className="h-4 w-4 text-muted-foreground" />}
            description="Opened by users"
          />
          <MetricCard
            title="Click Rate"
            value={`${keyMetrics.clickRate}%`}
            change={analytics?.clickRateChange}
            icon={<Activity className="h-4 w-4 text-muted-foreground" />}
            description="Clicked through"
          />
          <MetricCard
            title="Engagement Score"
            value={keyMetrics.engagementScore}
            change={analytics?.engagementScoreChange}
            icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
            description="Composite metric"
          />
        </div>
      )}

      {/* Detailed Analytics Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="delivery">Delivery</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="types">Types</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
        </Tabs>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Delivery Trends</CardTitle>
                <CardDescription>Notifications sent, delivered, and failed over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mb-2" />
                  <p>Chart visualization (Recharts integration)</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Engagement Trends</CardTitle>
                <CardDescription>Open and click rates over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  <Activity className="h-12 w-12 mb-2" />
                  <p>Chart visualization (Recharts integration)</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="delivery" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Delivery Metrics</CardTitle>
              <CardDescription>Detailed delivery statistics</CardDescription>
            </CardHeader>
            <CardContent>
              {deliveryMetrics && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Sent</p>
                      <p className="text-2xl font-bold">{deliveryMetrics.totalSent}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Delivered</p>
                      <p className="text-2xl font-bold text-green-500">{deliveryMetrics.totalDelivered}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Failed</p>
                      <p className="text-2xl font-bold text-red-500">{deliveryMetrics.totalFailed}</p>
                    </div>
                  </div>
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    <p>Time-series delivery chart (Recharts)</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Engagement Metrics</CardTitle>
              <CardDescription>User interaction statistics</CardDescription>
            </CardHeader>
            <CardContent>
              {engagementMetrics && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Opens</p>
                      <p className="text-2xl font-bold">{engagementMetrics.totalOpens}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Clicks</p>
                      <p className="text-2xl font-bold">{engagementMetrics.totalClicks}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Avg. Time to Open</p>
                      <p className="text-2xl font-bold">{engagementMetrics.avgTimeToOpen}m</p>
                    </div>
                  </div>
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    <p>Engagement funnel chart (Recharts)</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="types" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Type Breakdown</CardTitle>
              <CardDescription>Performance by notification type</CardDescription>
            </CardHeader>
            <CardContent>
              {typeBreakdown && typeBreakdown.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Sent</TableHead>
                      <TableHead className="text-right">Delivered</TableHead>
                      <TableHead className="text-right">Open Rate</TableHead>
                      <TableHead className="text-right">Click Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {typeBreakdown.map((item) => (
                      <TableRow key={item.type}>
                        <TableCell className="font-medium">
                          <Badge variant="secondary">{item.type}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{item.sent}</TableCell>
                        <TableCell className="text-right">{item.delivered}</TableCell>
                        <TableCell className="text-right">{item.openRate}%</TableCell>
                        <TableCell className="text-right">{item.clickRate}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No data available for selected period
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="channels" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Channel Performance</CardTitle>
              <CardDescription>Metrics by delivery channel</CardDescription>
            </CardHeader>
            <CardContent>
              {channelPerformance && channelPerformance.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {channelPerformance.map((channel) => (
                      <Card key={channel.channel}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2">
                            {channel.channel === 'push' && <Smartphone className="h-4 w-4" />}
                            {channel.channel === 'email' && <Mail className="h-4 w-4" />}
                            {channel.channel === 'in-app' && <Bell className="h-4 w-4" />}
                            {channel.channel === 'sms' && <MessageSquare className="h-4 w-4" />}
                            {channel.channel}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div>
                              <p className="text-xs text-muted-foreground">Delivery Rate</p>
                              <p className="text-lg font-bold">{channel.deliveryRate}%</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Open Rate</p>
                              <p className="text-lg font-bold">{channel.openRate}%</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No data available for selected period
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* A/B Test Results */}
      {abTestResults && abTestResults.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>A/B Test Results</CardTitle>
            <CardDescription>Active and completed A/B tests</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test Name</TableHead>
                  <TableHead>Variant</TableHead>
                  <TableHead className="text-right">Sample Size</TableHead>
                  <TableHead className="text-right">Open Rate</TableHead>
                  <TableHead className="text-right">Click Rate</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {abTestResults.map((test) => (
                  <TableRow key={`${test.testId}-${test.variant}`}>
                    <TableCell className="font-medium">{test.testName}</TableCell>
                    <TableCell>
                      <Badge variant={test.isWinner ? 'default' : 'outline'}>
                        {test.variant}
                        {test.isWinner && ' (Winner)'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{test.sampleSize}</TableCell>
                    <TableCell className="text-right">{test.openRate}%</TableCell>
                    <TableCell className="text-right">{test.clickRate}%</TableCell>
                    <TableCell>
                      <Badge variant={test.status === 'completed' ? 'default' : 'secondary'}>
                        {test.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default NotificationAnalyticsDashboard;
