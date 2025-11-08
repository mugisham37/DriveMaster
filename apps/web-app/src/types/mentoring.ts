export type RequestQuery<T> = {
  status: T;
  order?: string | undefined;
  criteria?: string | undefined;
  page?: number | undefined;
  trackSlug?: string | undefined;
};

export type MentorRequest<T> = {
  endpoint: string;
  query?: RequestQuery<T>;
};

export type DiscussionStatus =
  | "awaiting_mentor"
  | "awaiting_student"
  | "finished";

export type Discussion = {
  id: string;
  status: DiscussionStatus;
  title: string;
  track: {
    title: string;
    slug: string;
  };
  exercise: {
    title: string;
    slug: string;
  };
  student: {
    handle: string;
    avatarUrl: string;
  };
  mentor?: {
    handle: string;
    avatarUrl: string;
  };
  haveMentoringSlots: boolean;
  isNew: boolean;
  updatedAt: string;
  links: {
    self: string;
  };
};

export type Iteration = {
  id: string;
  submittedAt: string;
  analyzedAt: string | null;
  testingStatus: string;
  representation: string | null;
  analysis: {
    summary: string | null;
    comments: Array<{
      type: string;
      comment: string;
    }>;
  };
  files: Array<{
    filename: string;
    content: string;
    digest: string;
  }>;
};

export type MentoringRequest = {
  id: string;
  status: string;
  track: {
    title: string;
    slug: string;
  };
  exercise: {
    title: string;
    slug: string;
  };
  student: {
    handle: string;
    avatarUrl: string;
  };
  requestedAt: string;
  updatedAt: string;
  isNew: boolean;
  haveMentoringSlots: boolean;
  links: {
    self: string;
  };
};
