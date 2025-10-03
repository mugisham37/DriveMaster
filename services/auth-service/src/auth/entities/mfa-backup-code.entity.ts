import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index,
} from 'typeorm';
import { User } from './user.entity';

@Entity('mfa_backup_codes')
@Index(['userId', 'hashedCode'], { unique: true })
export class MfaBackupCode {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id' })
    userId: string;

    @Column({ name: 'hashed_code' })
    hashedCode: string;

    @Column({ name: 'is_active', default: false })
    isActive: boolean;

    @Column({ name: 'is_used', default: false })
    isUsed: boolean;

    @Column({ name: 'used_at', nullable: true })
    usedAt: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;
}