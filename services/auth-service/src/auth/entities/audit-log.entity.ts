import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('audit_logs')
@Index(['userId', 'timestamp'])
@Index(['ipAddress', 'timestamp'])
@Index(['action', 'timestamp'])
@Index(['outcome', 'timestamp'])
export class AuditLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id', nullable: true })
    @Index()
    userId?: string;

    @Column({ nullable: true })
    email?: string;

    @Column({ name: 'ip_address' })
    @Index()
    ipAddress: string;

    @Column({ name: 'user_agent', nullable: true, type: 'text' })
    userAgent?: string;

    @Column()
    @Index()
    action: string;

    @Column({ nullable: true })
    resource?: string;

    @Column()
    @Index()
    outcome: 'success' | 'failure' | 'blocked';

    @Column({ type: 'jsonb', nullable: true })
    details?: Record<string, any>;

    @Column({ name: 'session_id', nullable: true })
    sessionId?: string;

    @Column({ name: 'risk_score', nullable: true, type: 'float' })
    riskScore?: number;

    @CreateDateColumn({ name: 'timestamp' })
    @Index()
    timestamp: Date;
}