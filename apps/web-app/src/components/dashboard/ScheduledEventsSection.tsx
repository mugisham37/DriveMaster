import Link from 'next/link'
import { ScheduledEvent } from '@/lib/api/dashboard'

interface ScheduledEventsSectionProps {
  events: ScheduledEvent[]
}

export function ScheduledEventsSection({ events }: ScheduledEventsSectionProps) {
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <>
      <h2 className="text-h4 mb-4">Scheduled Events</h2>
      
      <p className="text-p-base mb-12">
        Join us for live coding sessions on our{' '}
        <Link 
          href="https://twitch.tv/exercismlive" 
          className="underline"
        >
          Twitch channel
        </Link>
        .{' '}
        <strong className="font-semibold">All times are UTC.</strong>
      </p>

      <ul className="text-p-base list-disc pl-16">
        {events.map((event) => (
          <li key={event.id} className="mb-4">
            <div className="font-medium text-textColor6 text-14 leading-100">
              {formatDateTime(event.startsAt)}
            </div>
            <strong className="font-semibold text-textColor2">
              {event.title}
            </strong>
          </li>
        ))}
      </ul>
    </>
  )
}