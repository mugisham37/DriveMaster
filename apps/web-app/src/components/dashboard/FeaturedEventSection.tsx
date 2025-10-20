import Link from 'next/link'
import Image from 'next/image'
import { LiveEvent } from '@/lib/api/dashboard'

interface FeaturedEventSectionProps {
  event: LiveEvent
}

export function FeaturedEventSection({ event }: FeaturedEventSectionProps) {
  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <>
      <div className="text-purple font-semibold leading-150 flex items-center mb-4">
        <span className="emoji mr-6">⏳</span>
        <span>Coming Soon</span>
      </div>
      
      <h2 className="text-h4 mb-2">{event.title}</h2>
      <p className="text-p-base mb-4">{event.description}</p>
      
      <div className="py-8 px-12 rounded-8 bg-veryLightBlue font-medium mb-16 self-start">
        <span>Live at </span>
        <strong className="font-semibold text-textColor1">
          {formatDateTime(event.startsAt)}
        </strong>
        <span> - save the date!</span>
      </div>

      {event.youtube && event.youtubeId && event.thumbnailUrl && (
        <Link 
          href={`https://www.youtube.com/watch?v=${event.youtubeId}`}
          className="bg-backgroundColorA flex flex-col items-center rounded-8 shadow-baseZ1 overflow-hidden"
        >
          <Image 
            src={event.thumbnailUrl} 
            alt={event.title}
            width={400}
            height={225}
            className="block w-fill"
          />
        </Link>
      )}
    </>
  )
}