import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from 'typeorm';
import { OAuthProvider } from './oauth-provider.entity';
import { RefreshToken } from './refresh-token.entity';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ unique: true })
    email: string;

    @Column({ name: 'email_verified', default: false })
    emailVerified: boolean;

    @Column({ name: 'hashed_password', nullable: true })
    hashedPassword: string;

    @Column({ name: 'country_code', length: 2 })
    countryCode: string;

    @Column({ default: 'UTC', length: 50 })
    timezone: string;

    @Column({ default: 'en', length: 5 })
    language: string;

    @Column({ type: 'jsonb', default: {} })
    preferences: Record<string, any>;

    @Column({ name: 'mfa_enabled', default: false })
    mfaEnabled: boolean;

    @Column({ name: 'mfa_secret', nullable: true })
    mfaSecret: string;

    @Column({ name: 'failed_login_attempts', default: 0 })
    failedLoginAttempts: number;

    @Column({ name: 'locked_until', nullable: true })
    lockedUntil: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @Column({ name: 'last_active_at', default: () => 'CURRENT_TIMESTAMP' })
    lastActiveAt: Date;

    @Column({ name: 'is_active', default: true })
    isActive: boolean;

    @OneToMany(() => OAuthProvider, (provider) => provider.user)
    oauthProviders: OAuthProvider[];

    @OneToMany(() => RefreshToken, (token) => token.user)
    refreshTokens: RefreshToken[];
}