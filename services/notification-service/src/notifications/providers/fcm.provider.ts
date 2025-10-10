import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as admin from "firebase-admin";
import {
  INotificationProvider,
  NotificationPayload,
  NotificationResult,
} from "../interfaces/notification.interface";
import { NotificationPriority } from "../dto/notification.dto";

@Injectable()
export class FCMProvider implements INotificationProvider {
  private readonly logger = new Logger(FCMProvider.name);
  private app: admin.app.App;

  constructor(private configService: ConfigService) {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      const serviceAccountPath = this.configService.get<string>(
        "FIREBASE_SERVICE_ACCOUNT_PATH"
      );
      const projectId = this.configService.get<string>("FIREBASE_PROJECT_ID");

      if (serviceAccountPath) {
        // Initialize with service account file
        this.app = admin.initializeApp(
          {
            credential: admin.credential.cert(serviceAccountPath),
            projectId,
          },
          "notification-service"
        );
      } else {
        // Initialize with environment variables
        const serviceAccount = {
          projectId: this.configService.get<string>("FIREBASE_PROJECT_ID"),
          clientEmail: this.configService.get<string>("FIREBASE_CLIENT_EMAIL"),
          privateKey: this.configService
            .get<string>("FIREBASE_PRIVATE_KEY")
            ?.replace(/\\n/g, "\n"),
        };

        this.app = admin.initializeApp(
          {
            credential: admin.credential.cert(serviceAccount),
          },
          "notification-service"
        );
      }

      this.logger.log("Firebase Admin SDK initialized successfully");
    } catch (error) {
      this.logger.error("Failed to initialize Firebase Admin SDK", error);
      throw error;
    }
  }

  async send(notification: NotificationPayload): Promise<NotificationResult> {
    try {
      const message = this.buildMessage(notification);

      if (notification.deviceTokens.length === 1) {
        // Single token send
        const response = await admin.messaging(this.app).send({
          ...message,
          token: notification.deviceTokens[0],
        });

        return {
          success: true,
          messageId: response,
          deliveredCount: 1,
          failedCount: 0,
        };
      } else {
        // Multicast send
        const response = await admin.messaging(this.app).sendMulticast({
          ...message,
          tokens: notification.deviceTokens,
        });

        const failedTokens = response.responses
          .map((resp, idx) =>
            resp.success ? null : notification.deviceTokens[idx]
          )
          .filter((token) => token !== null);

        return {
          success: response.successCount > 0,
          deliveredCount: response.successCount,
          failedCount: response.failureCount,
          failedTokens,
        };
      }
    } catch (error) {
      this.logger.error("Failed to send FCM notification", error);
      return {
        success: false,
        error: error.message,
        deliveredCount: 0,
        failedCount: notification.deviceTokens.length,
        failedTokens: notification.deviceTokens,
      };
    }
  }

  async sendBatch(
    notifications: NotificationPayload[]
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    // Process in batches of 500 (FCM limit)
    const batchSize = 500;
    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((notification) => this.send(notification))
      );
      results.push(...batchResults);
    }

    return results;
  }

  async validateToken(token: string): Promise<boolean> {
    try {
      // Try to send a dry-run message to validate the token
      await admin.messaging(this.app).send(
        {
          token,
          notification: {
            title: "Test",
            body: "Test",
          },
        },
        true
      ); // dry-run mode

      return true;
    } catch (error) {
      this.logger.warn(`Invalid FCM token: ${token}`, error.message);
      return false;
    }
  }

  private buildMessage(
    notification: NotificationPayload
  ): Omit<admin.messaging.Message, "token" | "topic" | "condition"> {
    const message = {
      notification: {
        title: notification.title,
        body: notification.body,
        imageUrl: notification.imageUrl,
      },
      data: notification.data
        ? this.stringifyData(notification.data)
        : undefined,
      android: this.buildAndroidConfig(notification),
      apns: this.buildApnsConfig(notification),
      webpush: this.buildWebpushConfig(notification), // cspell:disable-line
    };

    return message;
  }

  private buildAndroidConfig(
    notification: NotificationPayload
  ): admin.messaging.AndroidConfig {
    const messagePriority = this.mapPriorityToAndroid(notification.priority);
    const notificationPriority = this.mapNotificationPriorityToAndroid(
      notification.priority
    );

    return {
      priority: messagePriority,
      notification: {
        title: notification.title,
        body: notification.body,
        imageUrl: notification.imageUrl,
        sound: notification.sound || "default",
        clickAction: notification.clickAction,
        priority: notificationPriority,
        defaultSound: true,
        defaultVibrateTimings: true,
        defaultLightSettings: true,
      },
      data: notification.data
        ? this.stringifyData(notification.data)
        : undefined,
    };
  }

  private buildApnsConfig(
    notification: NotificationPayload
  ): admin.messaging.ApnsConfig {
    return {
      headers: {
        "apns-priority": this.mapPriorityToApns(notification.priority),
      },
      payload: {
        aps: {
          alert: {
            title: notification.title,
            body: notification.body,
          },
          badge: notification.badge,
          sound: notification.sound || "default",
          "content-available": notification.silent ? 1 : undefined,
          "mutable-content": 1, // Enable rich notifications
        },
        ...notification.data,
      },
    };
  }

  private buildWebpushConfig( // cspell:disable-line
    notification: NotificationPayload
  ): admin.messaging.WebpushConfig { // cspell:disable-line
    return {
      notification: {
        title: notification.title,
        body: notification.body,
        icon: notification.imageUrl,
        badge: "/assets/badge-icon.png",
        image: notification.imageUrl,
        requireInteraction:
          notification.priority === NotificationPriority.HIGH ||
          notification.priority === NotificationPriority.URGENT,
        silent: notification.silent,
        actions: notification.clickAction
          ? [
              {
                action: "open",
                title: "Open",
              },
            ]
          : undefined,
      },
      data: notification.data
        ? this.stringifyData(notification.data)
        : undefined,
    };
  }

  private mapPriorityToAndroid(
    priority: NotificationPriority
  ): "high" | "normal" {
    switch (priority) {
      case NotificationPriority.HIGH:
      case NotificationPriority.URGENT:
        return "high";
      default:
        return "normal";
    }
  }

  private mapNotificationPriorityToAndroid(
    priority: NotificationPriority
  ): "min" | "low" | "default" | "high" | "max" {
    switch (priority) {
      case NotificationPriority.URGENT:
        return "max";
      case NotificationPriority.HIGH:
        return "high";
      case NotificationPriority.LOW:
        return "low";
      default:
        return "default";
    }
  }

  private mapPriorityToApns(priority: NotificationPriority): string {
    switch (priority) {
      case NotificationPriority.HIGH:
      case NotificationPriority.URGENT:
        return "10";
      default:
        return "5";
    }
  }

  private stringifyData(data: Record<string, any>): Record<string, string> {
    const stringified: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      stringified[key] =
        typeof value === "string" ? value : JSON.stringify(value);
    }
    return stringified;
  }
}
