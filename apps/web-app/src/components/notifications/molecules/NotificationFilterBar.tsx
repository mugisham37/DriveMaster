'use client';

import { useState, useMemo, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Toggle } from '@/components/ui/toggle';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Search, X, Filter, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useDebounce } from '@/hooks/useDebounce';
import type { NotificationQueryParams } from '@/types/notification-service';

export interface NotificationFilterBarProps {
  filters: NotificationQueryParams;
  onFilterChange: (filters: NotificationQueryParams) => void;
  availableTypes?: string[];
  showSearch?: boolean;
  className?: string;
}

const DEFAULT_TYPES = [
  'achievement',
  'streak_reminder',
  'mock_test_reminder',
  'system',
  'mentoring',
  'course_update',
  'spaced_repetition',
];

export function NotificationFilterBar({
  filters,
  onFilterChange,
  availableTypes = DEFAULT_TYPES,
  showSearch = true,
  className,
}: NotificationFilterBarProps) {
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: filters.startDate,
    to: filters.endDate,
  });

  // Debounce search input
  const debouncedSearch = useDebounce(searchInput, 300);

  // Update filters when debounced search changes
  useMemo(() => {
    if (debouncedSearch !== filters.search) {
      onFilterChange({ ...filters, search: debouncedSearch });
    }
  }, [debouncedSearch]);

  const handleTypeChange = useCallback(
    (type: string) => {
      const currentTypes = Array.isArray(filters.type) ? filters.type : filters.type ? [filters.type] : [];
      const newTypes = currentTypes.includes(type)
        ? currentTypes.filter((t) => t !== type)
        : [...currentTypes, type];

      onFilterChange({
        ...filters,
        type: newTypes.length > 0 ? newTypes : undefined,
      });
    },
    [filters, onFilterChange]
  );

  const handleStatusToggle = useCallback(
    (status: 'all' | 'unread' | 'read') => {
      onFilterChange({
        ...filters,
        status: status === 'all' ? undefined : status,
      });
    },
    [filters, onFilterChange]
  );

  const handleDateRangeChange = useCallback(
    (range: { from?: Date; to?: Date }) => {
      setDateRange(range);
      onFilterChange({
        ...filters,
        startDate: range.from,
        endDate: range.to,
      });
    },
    [filters, onFilterChange]
  );

  const handleClearFilters = useCallback(() => {
    setSearchInput('');
    setDateRange({});
    onFilterChange({
      userId: filters.userId,
      limit: filters.limit,
    });
  }, [filters.userId, filters.limit, onFilterChange]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.type) count++;
    if (filters.status) count++;
    if (filters.startDate || filters.endDate) count++;
    if (filters.search) count++;
    return count;
  }, [filters]);

  const selectedTypes = useMemo(() => {
    return Array.isArray(filters.type) ? filters.type : filters.type ? [filters.type] : [];
  }, [filters.type]);

  return (
    <div className={cn('flex flex-col gap-3 p-4 bg-background border rounded-lg', className)}>
      {/* Search */}
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search notifications..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Type Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Type
              {selectedTypes.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {selectedTypes.length}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64" align="start">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm mb-2">Notification Types</h4>
              {availableTypes.map((type) => (
                <label
                  key={type}
                  className="flex items-center gap-2 cursor-pointer hover:bg-accent p-2 rounded"
                >
                  <input
                    type="checkbox"
                    checked={selectedTypes.includes(type)}
                    onChange={() => handleTypeChange(type)}
                    className="rounded"
                  />
                  <span className="text-sm capitalize">{type.replace(/_/g, ' ')}</span>
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* Status Toggle */}
        <div className="flex items-center gap-1 border rounded-md p-1">
          <Toggle
            size="sm"
            pressed={!filters.status}
            onPressedChange={() => handleStatusToggle('all')}
          >
            All
          </Toggle>
          <Toggle
            size="sm"
            pressed={filters.status === 'unread'}
            onPressedChange={() => handleStatusToggle('unread')}
          >
            Unread
          </Toggle>
          <Toggle
            size="sm"
            pressed={filters.status === 'read'}
            onPressedChange={() => handleStatusToggle('read')}
          >
            Read
          </Toggle>
        </div>

        {/* Date Range Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              {dateRange.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, 'MMM d')} - {format(dateRange.to, 'MMM d')}
                  </>
                ) : (
                  format(dateRange.from, 'MMM d, yyyy')
                )
              ) : (
                'Date Range'
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="p-3 space-y-2">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    handleDateRangeChange({ from: today, to: today });
                  }}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    const weekAgo = new Date(today);
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    handleDateRangeChange({ from: weekAgo, to: today });
                  }}
                >
                  Last 7 days
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    const monthAgo = new Date(today);
                    monthAgo.setMonth(monthAgo.getMonth() - 1);
                    handleDateRangeChange({ from: monthAgo, to: today });
                  }}
                >
                  Last 30 days
                </Button>
              </div>
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={(range) => handleDateRangeChange(range || {})}
                numberOfMonths={2}
              />
            </div>
          </PopoverContent>
        </Popover>

        {/* Clear Filters */}
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters} className="gap-2">
            <X className="h-4 w-4" />
            Clear ({activeFilterCount})
          </Button>
        )}
      </div>
    </div>
  );
}
