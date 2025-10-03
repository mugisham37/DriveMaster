import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Unique,
} from 'typeorm';
import { User } from './user.entity';

@Entity('oauth_providers')
@Unique(['provider', 'providerUserId'])
export class OAuthProvider {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'user_id' })
    userId: string;

    @Column({ length: 50 })
    provider: string;

    @Column({ name: 'provider_user_id' })
    providerUserId: string;

    @Column({ name: 'access_token_hash', nullable: true })
    accessTokenHash: string;

    @Column({ name: 'refresh_token_hash', nullable: true })
    refreshTokenHash: string;

    @Column({ name: 'expires_at', nullable: true })
    expiresAt: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @ManyToOne(() => User, (user) => user.oauthProviders, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;
}