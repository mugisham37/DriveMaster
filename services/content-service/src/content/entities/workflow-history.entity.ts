import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { Item, ItemStatus } from './item.entity';

export enum WorkflowAction {
    CREATED = 'created',
    SUBMITTED_FOR_REVIEW = 'submitted_for_review',
    ASSIGNED_REVIEWER = 'assigned_reviewer',
    APPROVED = 'approved',
    REJECTED = 'rejected',
    PUBLISHED = 'published',
    ARCHIVED = 'archived',
    RESTORED = 'restored',
    UPDATED = 'updated',
}

@Entity('workflow_history')
@Index(['itemId', 'createdAt'])
@Index(['performedBy', 'createdAt'])
@Index(['action'])
export class WorkflowHistory {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    @Index()
    itemId: string;

    @ManyToOne(() => Item, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'itemId' })
    item: Item;

    @Column({
        type: 'enum',
        enum: WorkflowAction,
    })
    @Index()
    action: WorkflowAction;

    @Column('uuid')
    @Index()
    performedBy: string;

    @Column({
        type: 'enum',
        enum: ItemStatus,
    })
    previousStatus: ItemStatus;

    @Column({
        type: 'enum',
        enum: ItemStatus,
    })
    newStatus: ItemStatus;

    @Column('text', { nullable: true })
    comments?: string;

    @Column('jsonb', { nullable: true })
    metadata?: Record<string, any>;

    @CreateDateColumn()
    @Index()
    createdAt: Date;
}