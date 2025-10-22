import React from 'react'
import { ConceptIcon } from '../ConceptIcon'
import { TrackIcon } from '../TrackIcon'
import { SiteUpdate as SiteUpdateProps, SiteUpdateContext } from '@/types'
import { missingExerciseIconErrorHandler } from '../imageErrorHandler'

interface SiteUpdateIconProps {
  context: SiteUpdateContext
  track: SiteUpdateProps['track']
  icon: SiteUpdateProps['icon']
}

export function SiteUpdateIcon({
  context,
  track,
  icon,
}: SiteUpdateIconProps): React.JSX.Element {
  switch (context) {
    case 'track':
      return <TrackIcon iconUrl={track.iconUrl} title={track.title} />
    case 'update':
      switch (icon.type) {
        case 'image':
          return (
            <img
              className="c-icon"
              src={icon.url}
              onError={missingExerciseIconErrorHandler}
              alt=""
            />
          )
        case 'concept':
          return <ConceptIcon size="large" name={icon.data || ''} />
      }
  }
}