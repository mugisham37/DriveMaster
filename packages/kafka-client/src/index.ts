import { Kafka, KafkaConfig } from 'kafkajs'

export function createKafka(config: KafkaConfig): Kafka {
  return new Kafka(config)
}
