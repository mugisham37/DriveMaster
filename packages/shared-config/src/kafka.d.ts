import { Kafka, Producer, Consumer } from 'kafkajs';
import type { KafkaConfig } from './environment';
export interface KafkaConnection {
    kafka: Kafka;
    producer: Producer;
    consumer: Consumer;
    close: () => Promise<void>;
}
export declare function createKafkaConnection(config: KafkaConfig): Promise<KafkaConnection>;
export declare class EventPublisher {
    private producer;
    constructor(producer: Producer);
    publish<T>(topic: string, key: string, message: T): Promise<boolean>;
    publishBatch<T>(topic: string, messages: Array<{
        key: string;
        value: T;
    }>): Promise<boolean>;
}
export declare class EventConsumer {
    private consumer;
    constructor(consumer: Consumer);
    subscribe(topics: string[]): Promise<void>;
    run<T>(handler: (message: T, metadata: MessageMetadata) => Promise<void>): Promise<void>;
}
export interface MessageMetadata {
    topic: string;
    partition: number;
    offset: string;
    key: string | undefined;
    timestamp: Date;
}
export declare function checkKafkaHealth(kafka: Kafka): Promise<boolean>;
export declare function createTopics(kafka: Kafka, topics: Array<{
    topic: string;
    numPartitions?: number;
    replicationFactor?: number;
}>): Promise<void>;
//# sourceMappingURL=kafka.d.ts.map