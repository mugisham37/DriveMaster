import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
    Index,
} from 'typeorm';
import { MediaAsset } from './media-asset.entity';

export enum ItemStatus {
    DRAFT = 'draft',
    UNDER_REVIEW = 'under_review',
    APPROVED = 'approved',
    PUBLISHED = 'published',
    ARCHIVED = 'archived',
}

export enum ItemType {
    MULTIPLE_CHOICE = 'multiple_choice',
    TRUE_FALSE = 'true_false',
    FILL_IN_BLANK = 'fill_in_blank',
    ESSAY = 'essay',
}

export enum CognitiveLevel {
    KNOWLEDGE = 'knowledge',
    COMPREHENSION = 'comprehension',
    APPLICATION = 'application',
    ANALYSIS = 'analysis',
    SYNTHESIS = 'synthesis',
    EVALUATION = 'evaluation',
}

@Entity('items')
@Index(['status', 'isActive'])
@Index('IDX_ITEMS_JURISDICTIONS_GIN', ['jurisdictions'])
@Index('IDX_ITEMS_TOPICS_GIN', ['topics'])
@Index(['difficulty'])
@Index(['publishedAt'])
export class Item {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    @Index()
    slug: string;

    // Content structure
    @Column('jsonb')
    content: {
        text: string;
        richFormatting?: any;
        instructions?: string;
    };

    @Column('jsonb')
    choices: Array<{
        id: string;
        text: string;
        explanation?: string;
    }>;

    @Column('jsonb')
    correct: {
        choiceIds: string[];
        explanation?: string;
    };

    @Column('jsonb', { nullable: true })
    explanation?: {
        text: string;
        richFormatting?: any;
    };

    // ML parameters
    @Column('float', { default: 0.0 })
    @Index()
    difficulty: number;

    @Column('float', { default: 1.0 })
    discrimination: number;

    @Column('float', { default: 0.25 })
    guessing: number;

    // Classification
    @Column('jsonb', { default: '[]' })
    topics: string[];

    @Column('jsonb', { default: '[]' })
    jurisdictions: string[];

    @Column({
        type: 'enum',
        enum: ItemType,
        default: ItemType.MULTIPLE_CHOICE,
    })
    itemType: ItemType;

    @Column({
        type: 'enum',
        enum: CognitiveLevel,
        default: CognitiveLevel.KNOWLEDGE,
    })
    cognitiveLevel: CognitiveLevel;

    // Media and resources
    @OneToMany(() => MediaAsset, (media) => media.item, { cascade: true })
    mediaAssets: MediaAsset[];

    @Column('jsonb', { default: '[]' })
    externalRefs: Array<{
        url: string;
        title: string;
        description?: string;
    }>;

    // Metadata
    @Column({ default: 60 })
    estimatedTime: number; // seconds

    @Column({ default: 1 })
    points: number;

    @Column('jsonb', { default: '[]' })
    tags: string[];

    // Workflow
    @Column({ default: 1 })
    version: number;

    @Column({
        type: 'enum',
        enum: ItemStatus,
        default: ItemStatus.DRAFT,
    })
    @Index()
    status: ItemStatus;

    @Column('uuid', { nullable: true })
    createdBy: string;

    @Column('uuid', { nullable: true })
    reviewedBy: string;

    @Column('uuid', { nullable: true })
    approvedBy: string;

    @Column({ nullable: true })
    @Index()
    publishedAt: Date;

    // Audit
    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column({ default: true })
    @Index()
    isActive: boolean;

    // Full-text search helper (will be created via migration)
    searchVector?: any;
}