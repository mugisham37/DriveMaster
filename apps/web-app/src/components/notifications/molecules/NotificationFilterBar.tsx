'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Toggle } from '@/components/ui/toggle';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Search, X, Filter, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useDebounce } from '@/hooks/useDebounce';
import type { NotificationQueryParams, NotificationType } from '@/types/notification-service';
import type { DateRange } from 'react-day-picker';

export interface NotificationFilterBarProps {
  filters: NotificationQueryParams;
  onFilterChange: (filters: NotificationQueryParams) => void;
  availableTypes?: NotificationType[];
  showSearch?: boolean;
  className?: string;
}

const DEFAULT_TYPES: NotificationType[] = [
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
  const [searchInput, setSearchInput] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: filters.startDate,
    to: filters.endDate,
  });

  // Debounce search input
  const debouncedSearch = useDebounce(searchInput, 300);

  // Update filters when debounced search changes
  useEffect(() => {
    // Only trigger if search actually changed
    if (debouncedSearch !== searchInput) {
      return;
    }
    // Implement search filtering in parent component
  }, [debouncedSearch, searchInput]);

  const handleTypeChange = useCallback(
    (type: NotificationType) => {
      const currentTypes = Array.isArray(filters.type) ? filters.type : filters.type ? [filters.type] : [];
      const newTypes = currentTypes.includes(type)
        ? currentTypes.filter((t) => t !== type)
        : [...currentTypes, type];

      const updatedFilters = { ...filters };
      if (newTypes.length > 0) {
        updatedFilters.type = newTypes as NotificationType[];
      } else {
        delete updatedFilters.type;
      }
      onFilterChange(updatedFilters);
    },
    [filters, onFilterChange]
  );

  const handleStatusToggle = useCallback(
    (status: 'all' | 'unread' | 'read') => {
      const updatedFilters = { ...filters };
      if (status === 'all') {
        delete updatedFilters.status;
      } else {
        updatedFilters.status = status;
      }
      onFilterChange(updatedFilters);
    },
    [filters, onFilterChange]
  );

  const handleDateRangeChange = useCallback(
    (range: DateRange | undefined) => {
      setDateRange(range);
      const updatedFilters = { ...filters };
      if (range?.from) {
        updatedFilters.startDate = range.from;
      } else {
        delete updatedFilters.startDate;
      }
      if (range?.to) {
        updatedFilters.endDate = range.to;
      } else {
        delete updatedFilters.endDate;
      }
      onFilterChange(updatedFilters);
    },
    [filters, onFilterChange]
  );

  const handleClearFilters = useCallback(() => {
    setSearchInput('');
    setDateRange(undefined);
    onFilterChange({
      userId: filters.userId,
      limit: filters.limit || 20,
    });
  }, [filters.userId, filters.limit, onFilterChange]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.type) count++;
    if (filters.status && filters.status !== 'all') count++;
    if (filters.startDate || filters.endDate) count++;
    if (searchInput) count++;
    return count;
  }, [filters, searchInput]);

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
              {dateRange?.from ? (
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
                onSelect={handleDateRangeChange}
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
