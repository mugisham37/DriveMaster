import { createKafka } from '@drivemaster/kafka-client'
import { learningEventsCounter } from '../metrics'

export async function startConsumers(brokers: string[]) {
  const kafka = createKafka(brokers.split(','), 'analytics-svc')
  const consumer = kafka.consumer({ groupId: 'analytics-svc-group' })
  await consumer.connect()
  await consumer.subscribe({ topic: 'learning.events.v1', fromBeginning: false })

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      learningEventsCounter.inc()
      // TODO: aggregate metrics and push to ES or Postgres
    },
  })
}