export interface GenericObject {
  [key: string]: unknown;
}

export interface TrackData {
  id: string;
  name: string;
  slug: string;
  title: string;
  description: string;
  status: string;
  // Add more specific fields as needed
}

export interface ContributionData {
  type: string;
  data: GenericObject;
  // Add more specific fields as needed
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  // Add more specific fields as needed
}

export interface JourneyData {
  tracks: TrackData[];
  progress: Record<string, number>;
  // Add more specific fields as needed
}

// Add more interfaces as needed for your specific use cases
