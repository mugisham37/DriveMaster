export interface EmailContext {
  user: {
    handle: string;
    email: string;
    name?: string;
  };
  track?: {
    title: string;
    slug: string;
  };
  exercise?: {
    title: string;
    slug: string;
  };
  discussion?: {
    uuid: string;
    status: string;
  };
  badge?: {
    name: string;
    iconUrl: string;
  };
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

// Notification email templates
export const notificationTemplates = {
  acquiredBadge: (context: EmailContext): EmailTemplate => ({
    subject: `Congratulations! You've earned the ${context.badge?.name} badge`,
    html: `<h1>Badge Earned!</h1><p>Congratulations ${context.user.handle}, you've earned the ${context.badge?.name} badge!</p>`,
    text: `Badge Earned! Congratulations ${context.user.handle}, you've earned the ${context.badge?.name} badge!`,
  }),

  mentorStartedDiscussion: (context: EmailContext): EmailTemplate => ({
    subject: `New mentoring discussion started for ${context.exercise?.title}`,
    html: `<h1>New Discussion</h1><p>A mentor has started a discussion on your ${context.exercise?.title} solution.</p>`,
    text: `New Discussion: A mentor has started a discussion on your ${context.exercise?.title} solution.`,
  }),

  joinedExercism: (context: EmailContext): EmailTemplate => ({
    subject: "Welcome to Exercism!",
    html: `<h1>Welcome ${context.user.handle}!</h1><p>Thanks for joining Exercism. We're excited to have you on board!</p>`,
    text: `Welcome ${context.user.handle}! Thanks for joining Exercism. We're excited to have you on board!`,
  }),
};

// Course email templates
export const courseTemplates = {
  courseWelcome: (context: EmailContext): EmailTemplate => ({
    subject: `Welcome to the ${context.track?.title} track!`,
    html: `<h1>Welcome to ${context.track?.title}!</h1><p>You've successfully joined the ${context.track?.title} track. Let's start coding!</p>`,
    text: `Welcome to ${context.track?.title}! You've successfully joined the ${context.track?.title} track. Let's start coding!`,
  }),

  exerciseCompleted: (context: EmailContext): EmailTemplate => ({
    subject: `Exercise completed: ${context.exercise?.title}`,
    html: `<h1>Great job!</h1><p>You've completed the ${context.exercise?.title} exercise in ${context.track?.title}.</p>`,
    text: `Great job! You've completed the ${context.exercise?.title} exercise in ${context.track?.title}.`,
  }),
};

// Donation email templates
export const donationTemplates = {
  donationReceived: (context: EmailContext): EmailTemplate => ({
    subject: "Thank you for your donation!",
    html: `<h1>Thank you ${context.user.handle}!</h1><p>Your donation helps keep Exercism free for everyone.</p>`,
    text: `Thank you ${context.user.handle}! Your donation helps keep Exercism free for everyone.`,
  }),

  donationReminder: (context: EmailContext): EmailTemplate => ({
    subject: "Support Exercism with a donation",
    html: `<h1>Hi ${context.user.handle}!</h1><p>Consider supporting Exercism with a donation to help us keep the platform free.</p>`,
    text: `Hi ${context.user.handle}! Consider supporting Exercism with a donation to help us keep the platform free.`,
  }),
};

export function getEmailTemplate(
  type: string,
  context: EmailContext,
): EmailTemplate {
  // Check notification templates
  if (type in notificationTemplates) {
    return notificationTemplates[type as keyof typeof notificationTemplates](
      context,
    );
  }

  // Check course templates
  if (type in courseTemplates) {
    return courseTemplates[type as keyof typeof courseTemplates](context);
  }

  // Check donation templates
  if (type in donationTemplates) {
    return donationTemplates[type as keyof typeof donationTemplates](context);
  }

  // Default template
  return {
    subject: "Notification from Exercism",
    html: "<p>You have a new notification from Exercism.</p>",
    text: "You have a new notification from Exercism.",
  };
}
