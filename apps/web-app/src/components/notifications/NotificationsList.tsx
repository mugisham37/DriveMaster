"use client";

import React, { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pagination } from "@/components/common/Pagination";
import { NotificationItem } from "./NotificationItem";
import { NotificationFilters } from "./NotificationFilters";
import { Loading } from "@/components/common/Loading";

interface Notification {
  id: string;
  uuid: string;
  type:
    | "acquired_badge"
    | "mentor_started_discussion"
    | "mentor_replied_to_discussion"
    | "student_replied_to_discussion"
    | "mentor_finished_discussion"
    | "student_finished_discussion"
    | "approach_introduction_approved"
    | "concept_contribution_approved"
    | "exercise_representation_published";
  url: string;
  text: string;
  imageType: "avatar" | "icon" | "exercise" | "track";
  imageUrl: string;
  createdAt: string;
  readAt?: string;
  isRead: boolean;
  status: "pending" | "unread" | "read";
  links: {
    markAsRead: string;
    all: string;
  };
}

interface NotificationsResponse {
  notifications: Notification[];
  meta: {
    currentPage: number;
    totalCount: number;
    totalPages: number;
    unreadCount: number;
  };
}

interface NotificationsListProps {
  request: {
    endpoint: string;
    query: {
      status?: string;
      type?: string;
      page?: number;
    };
    options: any;
  };
  defaultStatus: string;
}

export function NotificationsList({
  request,
  defaultStatus,
}: NotificationsListProps) {
  const [currentPage, setCurrentPage] = useState(request.query.page || 1);
  const [status, setStatus] = useState(defaultStatus);
  const [type, setType] = useState(request.query.type || "");

  const { data, isLoading, error, refetch } = useQuery<NotificationsResponse>({
    queryKey: ["notifications", status, type, currentPage],
    queryFn: async () => {
      const params = new URLSearchParams({
        status,
        page: currentPage.toString(),
        ...(type && { type }),
      });

      const response = await fetch(`${request.endpoint}?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }
      return response.json();
    },
    ...request.options,
  });

  const handleStatusChange = useCallback((newStatus: string) => {
    setStatus(newStatus);
    setCurrentPage(1);
  }, []);

  const handleTypeChange = useCallback((newType: string) => {
    setType(newType);
    setCurrentPage(1);
  }, []);

  const handleMarkAsRead = useCallback(
    async (notificationId: string) => {
      try {
        const response = await fetch(
          `/api/notifications/${notificationId}/mark-read`,
          {
            method: "PATCH",
          }
        );

        if (response.ok) {
          refetch();
        }
      } catch (error) {
        console.error("Failed to mark notification as read:", error);
      }
    },
    [refetch]
  );

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications/mark-all-read", {
        method: "PATCH",
      });

      if (response.ok) {
        refetch();
      }
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  }, [refetch]);

  if (isLoading) {
    return <Loading />;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-textColor6">
          Failed to load notifications. Please try again.
        </p>
        <button onClick={() => refetch()} className="btn-primary btn-s mt-4">
          Retry
        </button>
      </div>
    );
  }

  const notifications = data?.notifications || [];
  const meta = data?.meta || {
    currentPage: 1,
    totalCount: 0,
    totalPages: 1,
    unreadCount: 0,
  };

  return (
    <div className="notifications-list">
      <NotificationFilters
        status={status}
        type={type}
        unreadCount={meta.unreadCount}
        onStatusChange={handleStatusChange}
        onTypeChange={handleTypeChange}
        onMarkAllAsRead={handleMarkAllAsRead}
      />

      {notifications.length === 0 ? (
        <div className="text-center py-12">
          <div className="mb-4">
            <svg
              className="w-16 h-16 mx-auto text-textColor6"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          </div>
          <h3 className="text-h3 mb-2">No notifications</h3>
          <p className="text-textColor6">
            {status === "unread"
              ? "You're all caught up! No unread notifications."
              : "You don't have any notifications yet."}
          </p>
        </div>
      ) : (
        <>
          <div className="notifications-items space-y-2">
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={handleMarkAsRead}
              />
            ))}
          </div>

          {meta.totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                current={meta.currentPage}
                total={meta.totalPages}
                setPage={setCurrentPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
