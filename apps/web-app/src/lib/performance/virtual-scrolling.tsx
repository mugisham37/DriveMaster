/**
 * Virtual Scrolling Implementation
 * Optimizes rendering of large notification lists
 */

import React, { forwardRef } from 'react';
import { FixedSizeList, ListChildComponentProps } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';
import type { Notification } from '@/types/notifications';

interface VirtualNotificationListProps {
  notifications: Notification[];
  hasNextPage: boolean;
  isNextPageLoading: boolean;
  loadNextPage: () => Promise<void>;
  renderItem: (notification: Notification, index: number) => React.ReactNode;
  itemHeight?: number;
  height?: number;
  className?: string;
}

/**
 * Virtual scrolling list for notifications
 * Only renders visible items for optimal performance
 */
export const VirtualNotificationList: React.FC<VirtualNotificationListProps> = ({
  notifications,
  hasNextPage,
  isNextPageLoading,
  loadNextPage,
  renderItem,
  itemHeight = 120,
  height = 600,
  className,
}) => {
  const itemCount = hasNextPage ? notifications.length + 1 : notifications.length;

  const isItemLoaded = (index: number) => !hasNextPage || index < notifications.length;

  const loadMoreItems = isNextPageLoading ? () => Promise.resolve() : loadNextPage;

  const Item = ({ index, style }: ListChildComponentProps) => {
    if (!isItemLoaded(index)) {
      return (
        <div style={style} className="flex items-center justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      );
    }

    const notification = notifications[index];
    return <div style={style}>{renderItem(notification, index)}</div>;
  };

  return (
    <InfiniteLoader
      isItemLoaded={isItemLoaded}
      itemCount={itemCount}
      loadMoreItems={loadMoreItems}
    >
      {({ onItemsRendered, ref }) => (
        <FixedSizeList
          className={className}
          height={height}
          itemCount={itemCount}
          itemSize={itemHeight}
          onItemsRendered={onItemsRendered}
          ref={ref}
          width="100%"
        >
          {Item}
        </FixedSizeList>
      )}
    </InfiniteLoader>
  );
};

/**
 * Hook to determine if virtual scrolling should be enabled
 */
export const useVirtualScrolling = (itemCount: number, threshold = 50) => {
  return itemCount >= threshold;
};

/**
 * Calculate optimal item height based on content
 */
export const calculateItemHeight = (notification: Notification): number => {
  const baseHeight = 100;
  const hasImage = !!notification.imageUrl;
  const hasLongBody = notification.body.length > 200;

  let height = baseHeight;
  if (hasImage) height += 200;
  if (hasLongBody) height += 50;

  return height;
};
