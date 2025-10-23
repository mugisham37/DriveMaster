import React, { forwardRef } from 'react'
import type { MentorSessionTrack } from '@/components/types'

interface TrackObjectivesTextAreaProps {
  defaultValue?: string
  className?: string
  track: Pick<MentorSessionTrack, 'title' | 'medianWaitTime'>
}

export const TrackObjectivesTextArea = forwardRef<
  HTMLTextAreaElement,
  TrackObjectivesTextAreaProps
>(({ defaultValue = '', className = '', track }, ref) => {
  return (
    <div className={`track-objectives-textarea ${className}`}>
      <label htmlFor="track-objectives" className="block text-sm font-medium mb-2">
        What are you hoping to learn from {track.title}?
      </label>
      <textarea
        ref={ref}
        id="track-objectives"
        name="track_objectives"
        defaultValue={defaultValue}
        className="w-full p-3 border border-gray-300 rounded-md resize-vertical min-h-[80px]"
        placeholder={`What are your learning goals for ${track.title}?`}
      />
    </div>
  )
})

TrackObjectivesTextArea.displayName = 'TrackObjectivesTextArea'