export interface Item {
    id: string;
    slug: string;
    content: {
        text: string;
        richText?: string;
    };
    choices: Choice[];
    correct: string | string[];
    explanation?: {
        text: string;
        richText?: string;
    };
    difficulty: number;
    discrimination: number;
    guessing: number;
    topics: string[];
    jurisdictions: string[];
    itemType: 'multiple_choice' | 'true_false' | 'fill_blank';
    cognitiveLevel: 'knowledge' | 'comprehension' | 'application' | 'analysis';
    mediaRefs: MediaReference[];
    estimatedTime: number;
    points: number;
    tags: string[];
}

export interface Choice {
    id: string;
    text: string;
    richText?: string;
    mediaRef?: string;
}

export interface MediaReference {
    id: string;
    type: 'image' | 'video' | 'audio';
    url: string;
    alt?: string;
    caption?: string;
}

export interface PracticeSession {
    id: string;
    userId: string;
    sessionType: 'practice' | 'review' | 'mock_test' | 'placement';
    startTime: string;
    endTime?: string;
    itemsAttempted: number;
    correctCount: number;
    totalTimeMs: number;
    topicsPracticed: string[];
    averageDifficulty: number;
    status: 'active' | 'completed' | 'paused';
}

export interface Attempt {
    id: string;
    userId: string;
    itemId: string;
    sessionId: string;
    selected: string | string[];
    correct: boolean;
    quality: number; // 0-5 for SM-2
    confidence: number; // 1-5
    timeTakenMs: number;
    hintsUsed: number;
    timestamp: string;
}

export interface SessionProgress {
    currentItemIndex: number;
    totalItems: number;
    correctAnswers: number;
    timeElapsed: number;
    averageTimePerItem: number;
    topicsProgress: Record<string, {
        attempted: number;
        correct: number;
        mastery: number;
    }>;
}

export interface NextItemRequest {
    userId: string;
    sessionId: string;
    sessionType: 'practice' | 'review' | 'mock_test';
    timeConstraint?: number;
    topicFilter?: string[];
    difficultyRange?: [number, number];
}

export interface NextItemResponse {
    item: Item;
    reasoning: {
        score: number;
        components: {
            urgency: number;
            mastery: number;
            difficulty: number;
            exploration: number;
        };
    };
    sessionContext: {
        remainingTime?: number;
        recommendedBreak?: boolean;
    };
}

export interface SubmitAttemptRequest {
    sessionId: string;
    itemId: string;
    selected: string | string[];
    timeTakenMs: number;
    hintsUsed: number;
    confidence: number;
    clientAttemptId: string;
}

export interface SubmitAttemptResponse {
    correct: boolean;
    quality: number;
    explanation?: {
        text: string;
        richText?: string;
    };
    nextItem?: NextItemResponse;
    sessionProgress: SessionProgress;
    masteryUpdates: Record<string, number>;
}