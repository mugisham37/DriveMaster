import { Kafka, logLevel } from 'kafkajs'

export function createKafka(brokers: string[], clientId: string) {
  return new Kafka({ clientId, brokers, logLevel: logLevel.INFO })
}