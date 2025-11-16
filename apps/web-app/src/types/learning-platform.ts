/**
 * Learning Platform Data Models
 * 
 * TypeScript interfaces for the content learning platform
 * Based on design.md specifications
 */

// ============================================================================
// Question and Choice Types
// ============================================================================

export interface Choice {
  id: string;
  text: string;
  isCorrect: boolean;
  explanation?: string;
}

export interface Question {
  id: string;
  text: string;
  type: 'multiple-choice' | 'true-false' | 'multi-select';
  choices: Choice[];
  explanation: string;
  difficulty: number; // IRT difficulty parameter (-3 to 3)
  discrimination: number; // IRT discrimination parameter
  guessing: number; // IRT guessing parameter
  topics: string[];
  mediaAssets?: string[]; // Media asset IDs
  externalReferences?: ExternalReference[];
  estimatedTimeSeconds: number;
}

export interface ExternalReference {
  title: string;
  url: string;
  type: 'manual' | 'regulation' | 'guide' | 'video';
}

// ============================================================================
// Lesson Types
// ============================================================================

export interface Lesson {
  id: string;
  title: string;
  description: string;
  slug: string;
  type: 'lesson' | 'quiz' | 'assessment';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTimeMinutes: number;
  learningObjectives: string[];
  topics: string[];
  questions: Question[];
  unitId?: string;
  order: number;
  prerequisites: string[]; // Lesson IDs
  jurisdiction?: string;
  thumbnailUrl?: string;
}

// ============================================================================
// Unit and Curriculum Types
// ============================================================================

export interface Unit {
  id: string;
  title: string;
  description: string;
  icon: string;
  order: number;
  lessons: Lesson[];
  prerequisites: string[]; // Unit IDs
  estimatedTimeMinutes: number;
  jurisdiction?: string;
}

export interface Curriculum {
  id: string;
  title: string;
  jurisdiction: string;
  units: Unit[];
  totalLessons: number;
  totalQuestions: number;
  estimatedTimeHours: number;
}

// ============================================================================
// Progress and Mastery Types
// ============================================================================

export interface TopicMastery {
  topicId: string;
  topicName: string;
  masteryLevel: number; // 0-100
  questionsAnswered: number;
  correctAnswers: number;
  lastPracticed: Date;
  trend: 'improving' | 'stable' | 'declining';
}

export interface LessonProgress {
  lessonId: string;
  status: 'not-started' | 'in-progress' | 'completed';
  questionsCompleted: number;
  totalQuestions: number;
  score?: number;
  accuracy?: number;
  timeSpentSeconds: number;
  lastAccessed: Date;
  completedAt?: Date;
}

export interface UnitProgress {
  unitId: string;
  lessonsCompleted: number;
  totalLessons: number;
  completionPercentage: number;
  isUnlocked: boolean;
}

export interface UserProgress {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: Date;
  dailyGoal: number; // Questions per day
  dailyGoalProgress: number; // Questions answered today
  totalQuestionsAnswered: number;
  overallAccuracy: number;
  totalTimeSpentMinutes: number;
  topicMastery: TopicMastery[];
  lessonProgress: Map<string, LessonProgress>;
  unitProgress: Map<string, UnitProgress>;
  irtTheta: number; // User ability level (-3 to 3)
  jurisdiction: string;
}

// ============================================================================
// Activity and Session Types
// ============================================================================

export interface QuestionActivity {
  questionId: string;
  lessonId?: string;
  selectedChoiceId: string;
  isCorrect: boolean;
  timeSpentSeconds: number;
  timestamp: Date;
  sessionId: string;
  context: 'lesson' | 'practice' | 'review' | 'mock-test';
}

export interface LearningSession {
  id: string;
  userId: string;
  type: 'lesson' | 'practice' | 'review' | 'mock-test';
  startTime: Date;
  endTime?: Date;
  questionsAnswered: number;
  correctAnswers: number;
  accuracy: number;
  topics: string[];
  difficulty: number;
  activities: QuestionActivity[];
}

// ============================================================================
// Practice Mode Types
// ============================================================================

export interface PracticeSettings {
  topics: string[];
  difficultyRange: [number, number]; // Min and max IRT difficulty
  questionCount: number | 'unlimited';
  timed: boolean;
  timeLimit?: number; // Minutes
  includeReview: boolean;
}

export interface PracticeSession extends LearningSession {
  settings: PracticeSettings;
  adaptiveDifficulty: boolean;
  currentDifficulty: number;
  difficultyAdjustments: DifficultyAdjustment[];
}

export interface DifficultyAdjustment {
  timestamp: Date;
  fromDifficulty: number;
  toDifficulty: number;
  reason: 'consecutive-correct' | 'consecutive-incorrect' | 'time-pressure';
}

// ============================================================================
// Spaced Repetition Types
// ============================================================================

export interface SpacedRepetitionItem {
  questionId: string;
  userId: string;
  easinessFactor: number; // SM-2 algorithm
  interval: number; // Days until next review
  repetitions: number;
  nextReviewDate: Date;
  lastReviewDate: Date;
  lastReviewQuality: number; // 0-5 scale
}

export interface ReviewSession {
  dueItems: SpacedRepetitionItem[];
  completedItems: SpacedRepetitionItem[];
  totalDue: number;
  estimatedTimeMinutes: number;
}

// ============================================================================
// Mock Test Types
// ============================================================================

export interface MockTest {
  id: string;
  title: string;
  jurisdiction: string;
  questions: Question[];
  timeLimit: number; // Minutes
  passingScore: number; // Percentage
  instructions: string;
}

export interface MockTestSession extends LearningSession {
  testId: string;
  timeRemaining: number; // Seconds
  flaggedQuestions: Set<string>;
  answers: Map<string, string>; // questionId -> choiceId
  submitted: boolean;
  passed?: boolean;
  score?: number;
}

export interface MockTestResult {
  sessionId: string;
  testId: string;
  score: number;
  accuracy: number;
  passed: boolean;
  timeUsed: number; // Minutes
  topicBreakdown: TopicPerformance[];
  questionsReview: QuestionReview[];
  recommendations: string[];
}

export interface TopicPerformance {
  topicId: string;
  topicName: string;
  questionsAnswered: number;
  correctAnswers: number;
  accuracy: number;
}

export interface QuestionReview {
  questionId: string;
  question: Question;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  timeSpent: number;
}

// ============================================================================
// Recommendation Types
// ============================================================================

export interface RecommendationContext {
  userId: string;
  currentLessonId?: string;
  completedQuestions: string[];
  sessionPerformance: {
    accuracy: number;
    averageTime: number;
    consecutiveCorrect: number;
    consecutiveIncorrect: number;
  };
  topicsPracticed: string[];
  currentDifficulty: number;
}

export interface ContentRecommendation {
  contentId: string;
  contentType: 'lesson' | 'question' | 'unit';
  reason: string;
  confidence: number; // 0-1
  priority: number;
  metadata: {
    difficulty?: number;
    topics?: string[];
    estimatedTime?: number;
  };
}

// ============================================================================
// Achievement Types
// ============================================================================

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'streak' | 'mastery' | 'completion' | 'speed' | 'accuracy';
  requirement: string;
  progress: number; // 0-100
  unlocked: boolean;
  unlockedAt?: Date;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  requirement: string;
  progress: number;
  target: number;
  estimatedCompletion?: Date;
  completed: boolean;
  completedAt?: Date;
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface PerformanceMetrics {
  period: 'day' | 'week' | 'month' | 'all-time';
  questionsAnswered: number;
  accuracy: number;
  averageTimePerQuestion: number;
  topicsStudied: number;
  lessonsCompleted: number;
  streakDays: number;
  comparisonToPrevious: {
    questionsAnswered: number; // Percentage change
    accuracy: number;
    timeSpent: number;
  };
}

export interface AccuracyTrend {
  date: Date;
  accuracy: number;
  questionsAnswered: number;
}

export interface ActivityHeatmap {
  date: Date;
  questionsAnswered: number;
  timeSpentMinutes: number;
  intensity: 'none' | 'low' | 'medium' | 'high';
}

export interface WeakArea {
  topicId: string;
  topicName: string;
  currentMastery: number;
  trend: 'declining' | 'stagnant';
  recommendedAction: string;
  priority: 'high' | 'medium' | 'low';
}

// ============================================================================
// Search and Filter Types
// ============================================================================

export interface SearchFilters {
  query?: string;
  topics?: string[];
  difficulty?: ('beginner' | 'intermediate' | 'advanced')[];
  jurisdiction?: string;
  contentType?: ('lesson' | 'quiz' | 'assessment')[];
  completionStatus?: ('not-started' | 'in-progress' | 'completed')[];
}

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  type: 'lesson' | 'quiz' | 'assessment';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  topics: string[];
  thumbnailUrl?: string;
  estimatedTimeMinutes: number;
  completionStatus: 'not-started' | 'in-progress' | 'completed';
  relevanceScore: number;
  highlightedText?: string;
}

export interface SearchSuggestion {
  text: string;
  type: 'query' | 'topic' | 'lesson';
  count?: number;
}

// ============================================================================
// UI State Types
// ============================================================================

export interface LessonState {
  currentQuestionIndex: number;
  userAnswers: Map<string, string>; // questionId -> choiceId
  showFeedback: boolean;
  lessonComplete: boolean;
  score: number;
  accuracy: number;
  startTime: Date;
  timeElapsed: number; // Seconds
}

export interface PracticeState {
  phase: 'setup' | 'session' | 'summary';
  settings?: PracticeSettings;
  session?: PracticeSession;
  currentQuestionIndex: number;
  userAnswers: Map<string, string>;
  showFeedback: boolean;
}

export interface MockTestState {
  phase: 'setup' | 'session' | 'results';
  test?: MockTest;
  session?: MockTestSession;
  currentQuestionIndex: number;
  timeRemaining: number; // Seconds
  flaggedQuestions: Set<string>;
  answers: Map<string, string>;
}

// ============================================================================
// Error and Loading Types
// ============================================================================

export interface LoadingState {
  isLoading: boolean;
  progress?: number; // 0-100
  message?: string;
}

export interface ErrorState {
  hasError: boolean;
  error?: Error;
  message?: string;
  retryable: boolean;
  retryCount?: number;
}

// ============================================================================
// Notification Types
// ============================================================================

export interface LearningNotification {
  id: string;
  type: 'achievement' | 'streak' | 'goal' | 'review' | 'recommendation';
  title: string;
  message: string;
  icon?: string;
  action?: {
    label: string;
    url: string;
  };
  timestamp: Date;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
}
