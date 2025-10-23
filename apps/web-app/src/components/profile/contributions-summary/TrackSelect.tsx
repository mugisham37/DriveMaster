import React, { useCallback } from 'react'
import { TrackContribution } from '@/components/types'
import {
  TrackSelect as BaseTrackSelect,
  TrackLogo,
} from '@/components/common/TrackSelect'

const OptionComponent = ({
  option: track,
}: {
  option: TrackContribution
}): React.JSX.Element => {
  return (
    <React.Fragment>
      <TrackLogo track={{ slug: track.slug || '', title: track.title, iconUrl: track.iconUrl }} />
      <div className="title">{track.title}</div>
      <div className="count">{track.totalReputation.toLocaleString()} rep</div>
    </React.Fragment>
  )
}

const SelectedComponent = ({
  option: track,
}: {
  option: TrackContribution
}): React.JSX.Element => {
  return (
    <React.Fragment>
      <TrackLogo track={{ slug: track.slug || '', title: track.title, iconUrl: track.iconUrl }} />
      <div className="track-title">{track.title}</div>
      <div className="count">{track.totalReputation.toLocaleString()} rep</div>
    </React.Fragment>
  )
}

export const TrackSelect = ({
  tracks,
  value,
  setValue,
}: {
  tracks: readonly TrackContribution[]
  value: TrackContribution
  setValue: (value: TrackContribution) => void
}): React.JSX.Element => {
  const handleSet = useCallback(
    (track: TrackContribution) => {
      const matchingTrack = tracks.find((t) => t.slug === track.slug)

      if (!matchingTrack) {
        throw new Error('No matching track')
      }

      setValue(matchingTrack)
    },
    [setValue, tracks]
  )

  return (
    <BaseTrackSelect
      tracks={[...tracks]}
      value={value}
      setValue={handleSet}
      SelectedComponent={SelectedComponent}
      OptionComponent={OptionComponent}
    />
  )
}
