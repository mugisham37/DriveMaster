import Link from 'next/link'
import { LiveEvent } from '@/lib/api/dashboard'
import { YoutubePlayer } from '@/components/common/YoutubePlayer'

interface LiveEventSectionProps {
  event: LiveEvent
}

export function LiveEventSection({ event }: LiveEventSectionProps) {
  const twitchUrl = 'https://twitch.tv/exercismlive'
  const youtubeUrl = event.youtubeId ? `https://youtube.com/watch?v=${event.youtubeId}` : ''

  return (
    <>
      <div className="flex items-center mb-2">
        <div className="animate-pulse bg-alert rounded-circle mr-6 w-[10px] h-[10px]" />
        <div className="font-bold leading-150 flex items-center text-textColor2 text-12 uppercase">
          Live Now
        </div>
      </div>
      
      <h3 className="text-h4">{event.title}</h3>
      
      <p className="text-p-base mb-12">
        {event.description}
        {event.youtube ? (
          <>
            {' '}Watch on{' '}
            <Link href={twitchUrl} className="underline">Twitch</Link>
            {' '}or{' '}
            <Link href={youtubeUrl} className="underline">YouTube</Link>
          </>
        ) : (
          <>
            {' '}Watch on{' '}
            <Link href={twitchUrl} className="underline">Twitch</Link>
          </>
        )}
        {' '}👇🏽
      </p>

      <div className="rounded-8 shadow-baseZ1 w-fill overflow-hidden">
        {event.youtube && event.youtubeId ? (
          <YoutubePlayer videoId={event.youtubeId} context="dashboard" />
        ) : (
          <iframe
            src="https://player.twitch.tv/?channel=exercismlive&parent=exercism.org"
            height="240"
            width="100%"
            allowFullScreen
          />
        )}
      </div>
    </>
  )
}