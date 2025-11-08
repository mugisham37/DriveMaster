// Email sending service for Exercism
import {
  notificationTemplates,
  courseTemplates,
  donationTemplates,
} from "./templates";
import type { EmailTemplate, EmailContext } from "./templates";

export interface EmailOptions {
  to: string;
  from?: string;
  replyTo?: string;
  template: string;
  context: EmailContext;
}

export class ExercismMailer {
  private apiKey: string;
  private fromEmail: string;

  constructor() {
    this.apiKey =
      process.env.SENDGRID_API_KEY || process.env.RESEND_API_KEY || "";
    this.fromEmail = process.env.FROM_EMAIL || "noreply@exercism.org";
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const template = this.getTemplate(options.template, options.context);

      if (!template) {
        console.error(`Email template not found: ${options.template}`);
        return false;
      }

      // Use Resend API (modern alternative to SendGrid)
      if (process.env.RESEND_API_KEY) {
        return await this.sendWithResend(options, template);
      }

      // Fallback to console logging in development
      if (process.env.NODE_ENV === "development") {
        console.log("📧 Email would be sent:");
        console.log(`To: ${options.to}`);
        console.log(`Subject: ${template.subject}`);
        console.log(`Text: ${template.text}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Failed to send email:", error);
      return false;
    }
  }

  private async sendWithResend(
    options: EmailOptions,
    template: EmailTemplate,
  ): Promise<boolean> {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: options.from || this.fromEmail,
          to: [options.to],
          subject: template.subject,
          html: template.html,
          text: template.text,
          reply_to: options.replyTo,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error("Resend API error:", error);
      return false;
    }
  }

  private getTemplate(
    templateName: string,
    context: EmailContext,
  ): EmailTemplate | null {
    // Notification templates
    if (templateName in notificationTemplates) {
      return notificationTemplates[
        templateName as keyof typeof notificationTemplates
      ](context);
    }

    // Course templates
    if (templateName in courseTemplates) {
      return courseTemplates[templateName as keyof typeof courseTemplates](
        context,
      );
    }

    // Donation templates
    if (templateName in donationTemplates) {
      return donationTemplates[templateName as keyof typeof donationTemplates](
        context,
      );
    }

    return null;
  }

  // Convenience methods for common email types
  async sendNotificationEmail(
    type: keyof typeof notificationTemplates,
    to: string,
    context: EmailContext,
  ): Promise<boolean> {
    return this.sendEmail({
      to,
      template: type,
      context,
    });
  }

  async sendCourseEmail(
    type: keyof typeof courseTemplates,
    to: string,
    context: EmailContext,
  ): Promise<boolean> {
    return this.sendEmail({
      to,
      template: type,
      context,
    });
  }

  async sendDonationEmail(
    type: keyof typeof donationTemplates,
    to: string,
    context: EmailContext,
  ): Promise<boolean> {
    return this.sendEmail({
      to,
      template: type,
      context,
    });
  }
}

// Singleton instance
export const mailer = new ExercismMailer();

// Email queue for background processing
export interface QueuedEmail {
  id: string;
  options: EmailOptions;
  attempts: number;
  createdAt: Date;
  scheduledFor?: Date | undefined;
}

class EmailQueue {
  private queue: QueuedEmail[] = [];
  private processing = false;

  async addToQueue(
    options: EmailOptions,
    scheduledFor?: Date | undefined,
  ): Promise<string> {
    const id = `email_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    const queuedEmail: QueuedEmail = {
      id,
      options,
      attempts: 0,
      createdAt: new Date(),
      scheduledFor: scheduledFor ?? undefined,
    };

    this.queue.push(queuedEmail);

    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }

    return id;
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const email = this.queue.shift();
      if (!email) continue;

      // Check if email is scheduled for future
      if (email.scheduledFor && email.scheduledFor > new Date()) {
        // Put it back in queue
        this.queue.push(email);
        continue;
      }

      try {
        const success = await mailer.sendEmail(email.options);

        if (!success && email.attempts < 3) {
          // Retry failed emails up to 3 times
          email.attempts++;
          this.queue.push(email);
        }
      } catch (error) {
        console.error(`Failed to send email ${email.id}:`, error);
      }

      // Small delay between emails
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.processing = false;
  }

  getQueueStatus(): { pending: number; processing: boolean } {
    return {
      pending: this.queue.length,
      processing: this.processing,
    };
  }
}

export const emailQueue = new EmailQueue();
