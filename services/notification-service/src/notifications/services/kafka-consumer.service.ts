import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import { NotificationService } from './notification.service';
import { NotificationType, NotificationPriority } from '../dto/notification.dto';

interface AttemptEvent {
    user_id: string;
    item_id: string;
    session_id: string;
    correct: boolean;
    quality: number;
    time_taken_ms: number;
    timestamp: number;
    sm2_state_after?: any;
    bkt_state_after?: any;
}

interface SessionEvent {
    session_id: string;
    user_id: string;
    start_time: number;
    end_time: number;
    items_attempted: number;
    correct_count: number;
    session_type: 'PRACTICE' | 'REVIEW' | 'MOCK_TEST' | 'PLACEMENT';
    topics_practiced: string[];
}

interface PlacementEvent {
    user_id: string;
    placement_id: string;
    estimated_ability: Record<string, number>;
    completed_at: number;
}

@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(KafkaConsumerService.name);
    private kafka: Kafka;
    private consumer: Consumer;

    constructor(
        private configService: ConfigService,
        private notificationService: NotificationService,
    ) {
        this.kafka = new Kafka({
            clientId: 'notification-service',
            brokers: this.configService.get<string>('KAFKA_BROKERS', 'localhost:9092').split(','),
        });

        this.consumer = this.kafka.consumer({
            groupId: this.configService.get<string>('KAFKA_CONSUMER_GROUP', 'notification-service'),
        });
    }

    async onModuleInit() {
        try {
            await this.consumer.connect();

            // Subscribe to relevant topics
            await this.consumer.subscribe({
                topics: [
                    'user.attempts',
                    'user.sessions',
                    'user.placements',
                    'system.achievements',
                ],
                fromBeginning: false,
            });

            await this.consumer.run({
                eachMessage: async (payload: EachMessagePayload) => {
                    await this.handleMessage(payload);
                },
            });

            this.logger.log('Kafka consumer initialized and listening for events');
        } catch (error) {
            this.logger.error('Failed to initialize Kafka consumer', error);
        }
    }

    async onModuleDestroy() {
        try {
            await this.consumer.disconnect();
            this.logger.log('Kafka consumer disconnected');
        } catch (error) {
            this.logger.error('Error disconnecting Kafka consumer', error);
        }
    }

    private async handleMessage(payload: EachMessagePayload) {
        try {
            const { topic, message } = payload;
            const data = JSON.parse(message.value?.toString() || '{}');

            this.logger.debug(`Received message from topic ${topic}`, data);

            switch (topic) {
                case 'user.attempts':
                    await this.handleAttemptEvent(data as AttemptEvent);
                    break;
                case 'user.sessions':
                    await this.handleSessionEvent(data as SessionEvent);
                    break;
                case 'user.placements':
                    await this.handlePlacementEvent(data as PlacementEvent);
                    break;
                case 'system.achievements':
                    await this.handleAchievementEvent(data);
                    break;
                default:
                    this.logger.warn(`Unhandled topic: ${topic}`);
            }
        } catch (error) {
            this.logger.error('Error handling Kafka message', error);
        }
    }

    private async handleAttemptEvent(event: AttemptEvent) {
        try {
            // Check if user needs spaced repetition reminder
            if (event.sm2_state_after) {
                const nextDue = new Date(event.sm2_state_after.next_due);
                const now = new Date();

                // Schedule reminder for items due in the next 24 hours
                if (nextDue.getTime() - now.getTime() <= 24 * 60 * 60 * 1000) {
                    await this.notificationService.scheduleSpacedRepetitionReminder(
                        event.user_id,
                        'Review Items',
                        1,
                        nextDue
                    );
                }
            }

            // Check for streak opportunities
            if (event.correct && event.quality >= 4) {
                // User is performing well, might want to continue streak
                const reminderTime = new Date();
                reminderTime.setHours(reminderTime.getHours() + 2); // Remind in 2 hours

                // This would typically check user's current streak from database
                // For now, we'll assume a streak of 5
                await this.notificationService.scheduleStreakReminder(
                    event.user_id,
                    5,
                    reminderTime
                );
            }
        } catch (error) {
            this.logger.error('Error handling attempt event', error);
        }
    }

    private async handleSessionEvent(event: SessionEvent) {
        try {
            const accuracy = event.items_attempted > 0 ?
                (event.correct_count / event.items_attempted) * 100 : 0;

            // If user performed well in practice, suggest mock test
            if (event.session_type === 'PRACTICE' && accuracy >= 80 && event.items_attempted >= 10) {
                const reminderTime = new Date();
                reminderTime.setDate(reminderTime.getDate() + 1); // Tomorrow

                await this.notificationService.scheduleMockTestReminder(
                    event.user_id,
                    'driving theory',
                    Math.round(accuracy),
                    reminderTime
                );
            }

            // Congratulate on good performance
            if (accuracy >= 90 && event.items_attempted >= 5) {
                await this.notificationService.sendAchievementNotification(
                    event.user_id,
                    'High Performer',
                    `achieving ${Math.round(accuracy)}% accuracy in your recent session`
                );
            }

            // Encourage if performance is low
            if (accuracy < 60 && event.items_attempted >= 5) {
                const reminderTime = new Date();
                reminderTime.setHours(reminderTime.getHours() + 4); // Remind in 4 hours

                await this.notificationService.scheduleSpacedRepetitionReminder(
                    event.user_id,
                    event.topics_practiced.join(', '),
                    event.items_attempted,
                    reminderTime
                );
            }
        } catch (error) {
            this.logger.error('Error handling session event', error);
        }
    }

    private async handlePlacementEvent(event: PlacementEvent) {
        try {
            // Determine skill level based on average ability
            const abilities = Object.values(event.estimated_ability);
            const avgAbility = abilities.reduce((sum, ability) => sum + ability, 0) / abilities.length;

            let skillLevel = 'beginner';
            if (avgAbility > 0.5) skillLevel = 'intermediate';
            if (avgAbility > 1.0) skillLevel = 'advanced';

            // Send placement completion notification
            await this.notificationService.sendNotification({
                userId: event.user_id,
                title: 'Placement test completed!',
                body: `Great job! Your personalized learning path is ready. You're estimated to be at ${skillLevel} level.`,
                data: {
                    type: 'placement_complete',
                    skillLevel,
                    avgAbility: avgAbility.toFixed(2),
                },
                priority: NotificationPriority.HIGH,
            });

            // Schedule first learning session reminder
            const firstSessionTime = new Date();
            firstSessionTime.setHours(firstSessionTime.getHours() + 2);

            await this.notificationService.scheduleSpacedRepetitionReminder(
                event.user_id,
                'your personalized topics',
                5,
                firstSessionTime
            );
        } catch (error) {
            this.logger.error('Error handling placement event', error);
        }
    }

    private async handleAchievementEvent(event: any) {
        try {
            await this.notificationService.sendAchievementNotification(
                event.user_id,
                event.achievement_name,
                event.achievement_description
            );
        } catch (error) {
            this.logger.error('Error handling achievement event', error);
        }
    }

    // Method to manually trigger notification processing (for testing)
    async processTestEvent(topic: string, data: any) {
        await this.handleMessage({
            topic,
            partition: 0,
            message: {
                key: Buffer.from('test'),
                value: Buffer.from(JSON.stringify(data)),
                timestamp: Date.now().toString(),
                offset: '0',
                headers: {},
            },
        } as EachMessagePayload);
    }
}