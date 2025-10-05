export interface UserStats {
    totalQuestions: number;
    correctAnswers: number;
    accuracy: number;
    studyStreak: number;
    timeStudied: number; // in hours
    masteredTopics: number;
    totalTopics: number;
    averageSessionTime: number; // in minutes
    questionsPerDay: number;
    improvementRate: number; // percentage
}

export interface TopicMastery {
    topic: string;
    mastery: number; // 0-1
    confidence: number; // 0-1
    questionsAttempted: number;
    correctAnswers: number;
    accuracy: number;
    lastPracticed: string;
    averageTime: number; // seconds
    difficulty: 'easy' | 'medium' | 'hard';
    trend: 'improving' | 'stable' | 'declining';
}

export interface LearningPath {
    id: string;
    name: string;
    description: string;
    topics: string[];
    estimatedHours: number;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    progress: number; // 0-1
    isRecommended: boolean;
    prerequisites: string[];
}

export interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string;
    category: 'accuracy' | 'streak' | 'mastery' | 'speed' | 'milestone';
    unlockedAt: string;
    progress?: number; // 0-1 for progress-based achievements
    target?: number;
    isRare: boolean;
}

export interface StudyGoal {
    id: string;
    title: string;
    description: string;
    type: 'daily_questions' | 'weekly_hours' | 'topic_mastery' | 'accuracy_target';
    target: number;
    current: number;
    deadline?: string;
    isActive: boolean;
    createdAt: string;
}

export interface PerformanceInsight {
    id: string;
    type: 'strength' | 'weakness' | 'recommendation' | 'milestone';
    title: string;
    description: string;
    actionable: boolean;
    priority: 'low' | 'medium' | 'high';
    relatedTopics: string[];
    createdAt: string;
}

export interface SessionAnalytics {
    date: string;
    sessionType: 'practice' | 'review' | 'mock_test';
    duration: number; // minutes
    questionsAttempted: number;
    correctAnswers: number;
    accuracy: number;
    topicsStudied: string[];
    averageTimePerQuestion: number; // seconds
    difficultyDistribution: {
        easy: number;
        medium: number;
        hard: number;
    };
}

export interface ProgressTimeline {
    date: string;
    accuracy: number;
    questionsAnswered: number;
    timeStudied: number; // minutes
    topicsMastered: number;
    streak: number;
}

export interface ComparisonData {
    userPercentile: number;
    averageAccuracy: number;
    averageQuestionsPerDay: number;
    averageStudyTime: number;
    topPerformers: {
        accuracy: number;
        questionsPerDay: number;
        studyTime: number;
    };
}

export interface LeaderboardEntry {
    rank: number;
    userId: string;
    username: string;
    avatar?: string;
    score: number;
    accuracy: number;
    questionsAnswered: number;
    streak: number;
    isCurrentUser: boolean;
}

export interface WeeklyReport {
    weekStart: string;
    weekEnd: string;
    totalQuestions: number;
    accuracy: number;
    timeStudied: number;
    topicsStudied: string[];
    achievements: Achievement[];
    insights: PerformanceInsight[];
    comparison: {
        previousWeek: {
            accuracy: number;
            questions: number;
            timeStudied: number;
        };
        improvement: {
            accuracy: number;
            questions: number;
            timeStudied: number;
        };
    };
}