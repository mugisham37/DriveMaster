import { useCallback } from "react";
import { EmailContext } from "@/lib/email/templates";

export function useEmailNotifications() {
  const sendNotificationEmail = useCallback(
    async (
      type: string,
      to: string,
      context: EmailContext,
    ): Promise<boolean> => {
      try {
        const response = await fetch("/api/email/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            template: type,
            to,
            context,
          }),
        });

        return response.ok;
      } catch (error) {
        console.error("Failed to send notification email:", error);
        return false;
      }
    },
    [],
  );

  const sendBadgeNotification = useCallback(
    async (
      userEmail: string,
      userHandle: string,
      badgeName: string,
      badgeIconUrl: string,
    ) => {
      return sendNotificationEmail("acquiredBadge", userEmail, {
        user: { handle: userHandle, email: userEmail },
        badge: { name: badgeName, iconUrl: badgeIconUrl },
      });
    },
    [sendNotificationEmail],
  );

  const sendMentoringNotification = useCallback(
    async (
      type:
        | "mentorStartedDiscussion"
        | "mentorRepliedToDiscussion"
        | "studentRepliedToDiscussion",
      userEmail: string,
      userHandle: string,
      exerciseTitle: string,
      exerciseSlug: string,
      trackTitle: string,
      trackSlug: string,
      discussionUuid: string,
      discussionStatus: string,
    ) => {
      return sendNotificationEmail(type, userEmail, {
        user: { handle: userHandle, email: userEmail },
        exercise: { title: exerciseTitle, slug: exerciseSlug },
        track: { title: trackTitle, slug: trackSlug },
        discussion: { uuid: discussionUuid, status: discussionStatus },
      });
    },
    [sendNotificationEmail],
  );

  const sendWelcomeEmail = useCallback(
    async (userEmail: string, userHandle: string) => {
      return sendNotificationEmail("joinedExercism", userEmail, {
        user: { handle: userHandle, email: userEmail },
      });
    },
    [sendNotificationEmail],
  );

  return {
    sendBadgeNotification,
    sendMentoringNotification,
    sendWelcomeEmail,
    sendNotificationEmail,
  };
}
