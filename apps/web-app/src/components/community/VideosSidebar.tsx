'use client'

import React from 'react'
import Link from 'next/link'
import { YoutubePlayer } from '@/components/common/YoutubePlayer'

interface LiveEvent {
  id: number
  title: string
  description: string
  youtube?: boolean
  youtubeId?: string
}

interface FeaturedEvent {
  id: number
  title: string
  description: string
  startsAt: string
  youtube?: boolean
  youtubeId?: string
  thumbnailUrl?: string
}

interface ScheduledEvent {
  id: number
  title: string
  startsAt: string
}

interface VideosSidebarProps {
  liveEvent?: LiveEvent
  featuredEvent?: FeaturedEvent
  scheduledEvents: ScheduledEvent[]
}

export function VideosSidebar({ 
  liveEvent, 
  featuredEvent, 
  scheduledEvents 
}: VideosSidebarProps): React.JSX.Element {
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="videos-sidebar">
      {liveEvent && (
        <div className="mb-32">
          <div className="flex items-center mb-2">
            <div className="animate-pulse bg-alert rounded-circle mr-6 w-[10px] h-[10px]" />
            <div className="font-bold leading-150 flex items-center text-textColor2 text-12 uppercase">
              Live Now
            </div>
          </div>
          <h3 className="text-h4">{liveEvent.title}</h3>
          
          <p className="text-p-base mb-12">
            {liveEvent.description}
            {liveEvent.youtube ? (
              <>
                {' '}Watch on both{' '}
                <Link href="https://www.twitch.tv/exercismlive" className="underline">
                  Twitch
                </Link>
                {' '}and{' '}
                <Link 
                  href={`https://www.youtube.com/watch?v=${liveEvent.youtubeId}`} 
                  className="underline"
                >
                  YouTube
                </Link>
                {' '}👇🏽
              </>
            ) : (
              <>
                {' '}Watch on{' '}
                <Link href="https://www.twitch.tv/exercismlive" className="underline">
                  Twitch
                </Link>
                {' '}👇🏽
              </>
            )}
          </p>

          <div className="rounded-8 shadow-baseZ1 w-fill overflow-hidden">
            {liveEvent.youtube && liveEvent.youtubeId ? (
              <YoutubePlayer videoId={liveEvent.youtubeId} context="community" />
            ) : (
              <iframe 
                src="https://player.twitch.tv/?channel=exercismlive&parent=exercism.org" 
                height="240" 
                width="100%" 
                allowFullScreen
              />
            )}
          </div>
        </div>
      )}

      {featuredEvent && (
        <div className="flex flex-col mb-32">
          <div className="text-purple font-semibold leading-150 flex items-center mb-4">
            <span className="emoji mr-6">⏳</span>
            Coming Up
          </div>
          <h2 className="text-h4 mb-2">{featuredEvent.title}</h2>
          <p className="text-p-base mb-4">{featuredEvent.description}</p>
          <div className="py-8 px-12 rounded-8 bg-veryLightBlue font-medium mb-16 self-start">
            Live at{' '}
            <strong className="font-semibold text-textColor1">
              {formatDateTime(featuredEvent.startsAt)}.
            </strong>
            {' '}Save the date!
          </div>

          {featuredEvent.youtube && featuredEvent.youtubeId && (
            <Link 
              href={`https://www.youtube.com/watch?v=${featuredEvent.youtubeId}`} 
              className="bg-backgroundColorA flex flex-col items-center rounded-8 shadow-baseZ1 overflow-hidden"
            >
              <img 
                src={featuredEvent.thumbnailUrl} 
                className="block w-fill" 
                alt=""
              />
            </Link>
          )}
        </div>
      )}

      {scheduledEvents.length > 0 && (
        <div className="border-1 border-gradient-lightPurple px-16 py-12 rounded-8 mb-24">
          <h2 className="text-h4 mb-4">Scheduled Events</h2>
          <p className="text-p-base mb-4">
            Join us for upcoming live streams on our{' '}
            <Link 
              href="https://twitch.tv/exercismlive" 
              className="underline"
            >
              Twitch channel
            </Link>
            . All times are in your local timezone.
          </p>
          <p className="text-p-base mb-12">
            Don't forget to follow us to get notified when we go live!
          </p>

          <ul className="text-p-base list-disc pl-16">
            {scheduledEvents.map((event) => (
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
        </div>
      )}
    </div>
  )
}

export default VideosSidebar