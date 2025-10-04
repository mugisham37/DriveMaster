import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { Item } from './item.entity';

export enum MediaType {
    IMAGE = 'image',
    VIDEO = 'video',
    AUDIO = 'audio',
    DOCUMENT = 'document',
}

@Entity('media_assets')
@Index(['itemId'])
@Index(['mediaType'])
export class MediaAsset {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    @Index()
    itemId: string;

    @ManyToOne(() => Item, (item) => item.mediaAssets, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'itemId' })
    item: Item;

    @Column()
    filename: string;

    @Column()
    originalName: string;

    @Column({
        type: 'enum',
        enum: MediaType,
    })
    @Index()
    mediaType: MediaType;

    @Column()
    mimeType: string;

    @Column('bigint')
    size: number;

    @Column()
    s3Key: string;

    @Column()
    s3Bucket: string;

    @Column({ nullable: true })
    cdnUrl?: string;

    @Column('jsonb', { nullable: true })
    metadata?: {
        width?: number;
        height?: number;
        duration?: number;
        alt?: string;
        caption?: string;
    };

    @Column({ default: 1 })
    version: number;

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}