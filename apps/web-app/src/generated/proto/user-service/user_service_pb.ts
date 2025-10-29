// Generated TypeScript interfaces from user_service.proto
// This file is auto-generated. Do not edit manually.

// Note: Timestamp and Struct types are handled by the comprehensive types in user-service.ts

export interface User {
  id: string;
  email: string;
  emailVerified: boolean;
  countryCode: string;
  timezone: string;
  language: string;
  userRole: string;
  mfaEnabled: boolean;
  gdprConsent: boolean;
  isActive: boolean;
}

export interface UserPreferences {
  userId: string;
}

export interface SkillMastery {
  userId: string;
  topic: string;
  mastery: number;
  confidence: number;
  practiceCount: number;
  correctStreak: number;
  longestStreak: number;
  totalTimeMs: number;
}

export interface ProgressSummary {
  userId: string;
  totalAttempts: number;
  totalCorrect: number;
  overallAccuracy: number;
  totalStudyTimeMs: number;
  consecutiveDays: number;
  topicsPracticed: number;
}

export interface SM2State {
  easinessFactor: number;
  interval: number;
  repetition: number;
}

export interface BKTState {
  probKnowledge: number;
  probGuess: number;
  probSlip: number;
  probLearn: number;
}

export interface IRTAbility {
  theta: number;
  confidenceLower: number;
  confidenceUpper: number;
  attemptsCount: number;
}

export interface SchedulerState {
  userId: string;
  currentSessionId: string;
  consecutiveDays: number;
  totalStudyTimeMs: number;
  version: number;
}

export interface UserActivity {
  userId: string;
  activityType: string;
  sessionId: string;
  deviceType: string;
  appVersion: string;
}

export interface ActivitySummary {
  userId: string;
  sessionsToday: number;
  sessionsThisWeek: number;
  timeTodayMs: number;
  timeThisWeekMs: number;
}

export interface GetUserRequest {
  userId: string;
}

export interface GetUserResponse {
  user: User;
}

export interface UpdateUserRequest {
  userId: string;
}

export interface UpdateUserResponse {
  user: User;
}

export interface GetUserPreferencesRequest {
  userId: string;
}

export interface GetUserPreferencesResponse {
  preferences: UserPreferences;
}

export interface UpdatePreferencesRequest {
  userId: string;
}

export interface UpdatePreferencesResponse {
  preferences: UserPreferences;
}

export interface DeactivateUserRequest {
  userId: string;
  reason: string;
}

export interface DeactivateUserResponse {
  success: boolean;
}

export interface GetMasteryRequest {
  userId: string;
}

export interface GetMasteryResponse {
  masteries: Record<string, number>;
}

export interface UpdateMasteryRequest {
  userId: string;
  topic: string;
  mastery: number;
}

export interface UpdateMasteryResponse {
  mastery: SkillMastery;
}

export interface GetProgressSummaryRequest {
  userId: string;
}

export interface GetProgressSummaryResponse {
  summary: ProgressSummary;
}

export interface GetSchedulerStateRequest {
  userId: string;
}

export interface GetSchedulerStateResponse {
  state: SchedulerState;
}

export interface UpdateSchedulerStateRequest {
  userId: string;
  state: SchedulerState;
}

export interface UpdateSchedulerStateResponse {
  state: SchedulerState;
}

export interface InitializeSchedulerStateRequest {
  userId: string;
}

export interface InitializeSchedulerStateResponse {
  state: SchedulerState;
}

export interface RecordActivityRequest {
  activity: UserActivity;
}

export interface RecordActivityResponse {
  success: boolean;
}

export interface GetActivitySummaryRequest {
  userId: string;
}

export interface GetActivitySummaryResponse {
  summary: ActivitySummary;
}

export type HealthCheckRequest = object

export interface HealthCheckResponse {
  status: string;
}

export interface CreateSchedulerStateRequest {
  userId: string;
}

export interface CreateSchedulerStateResponse {
  state: SchedulerState;
}

export interface UpdateSM2StateRequest {
  userId: string;
  itemId: string;
  quality: number;
}

export interface UpdateSM2StateResponse {
  state: SchedulerState;
}

export interface UpdateBKTStateRequest {
  userId: string;
  topic: string;
  correct: boolean;
}

export interface UpdateBKTStateResponse {
  state: SchedulerState;
}

export interface UpdateAbilityRequest {
  userId: string;
  topic: string;
  ability: number;
  confidence: number;
}

export interface UpdateAbilityResponse {
  state: SchedulerState;
}

export interface StartSessionRequest {
  userId: string;
  sessionId: string;
}

export interface StartSessionResponse {
  state: SchedulerState;
}

export interface EndSessionRequest {
  userId: string;
  studyTimeMs: number;
}

export interface EndSessionResponse {
  state: SchedulerState;
}

export interface CreateBackupRequest {
  userId: string;
  reason: string;
}

export interface CreateBackupResponse {
  backupId: string;
}

export interface RestoreFromBackupRequest {
  backupId: string;
}

export interface RestoreFromBackupResponse {
  state: SchedulerState;
}
