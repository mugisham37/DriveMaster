import React from 'react'
import { TrackIcon, Icon } from '../../common'
import { FetchingBoundary } from '../../FetchingBoundary'
import { AutomationTrack } from '@/components/types'
import { QueryKey, QueryStatus } from '@tanstack/react-query'
import { useDropdown } from '../../dropdowns/useDropdown'
import { ResultsZone } from '../../ResultsZone'
import { pluralizeWithNumber } from '../../../utils/pluralizeWithNumber'

type TrackFilterProps = AutomationTrack & {
  checked: boolean
  onChange: (e: React.ChangeEvent) => void
  countText: string
}

const TrackFilter = ({
  title,
  iconUrl,
  numSubmissions,
  checked,
  onChange,
  countText,
}: TrackFilterProps): React.JSX.Element => {
  return (
    <label className="c-radio-wrapper">
      <input
        type="radio"
        onChange={onChange}
        checked={checked}
        name="queue_track"
      />
      <div className="row">
        <TrackIcon iconUrl={iconUrl} title={title} />
        <div className="title">{title}</div>
        <div className="count">
          {pluralizeWithNumber(numSubmissions, countText)}
        </div>
      </div>
    </label>
  )
}

const DEFAULT_ERROR = new Error('Unable to fetch tracks')

export const TrackFilterList = ({
  status,
  error,
  children,
  ...props
}: React.PropsWithChildren<
  Props & { status: QueryStatus; error: unknown }
>): React.JSX.Element => {
  return (
    <FetchingBoundary
      error={error as Error | null}
      status={status}
      defaultError={DEFAULT_ERROR}
    >
      <Component {...props}>{children}</Component>
    </FetchingBoundary>
  )
}

type Props = {
  tracks: AutomationTrack[] | undefined
  isFetching: boolean
  value: AutomationTrack
  setValue: (value: AutomationTrack) => void
  cacheKey: QueryKey
  sizeVariant?: 'large' | 'multi' | 'inline' | 'single' | 'automation'
  countText: string
}

const Component = ({
  sizeVariant = 'large',
  tracks,
  isFetching,
  value,
  setValue,
  countText,
}: Props): React.JSX.Element | null => {
  // changeTracksRef removed as it's not used
  const {
    buttonAttributes,
    panelAttributes,
    isOpen,
    close,
    toggle,
  } = useDropdown()
  
  // handleItemSelect removed as it's not used in current implementation

  if (!tracks) {
    return null
  }

  return (
    <div className={`c-single-select c-track-select --size-${sizeVariant}`}>
      <ResultsZone isFetching={isFetching}>
        <button
          className="current-track"
          aria-label="Open the track filter"
          onClick={toggle}
          {...buttonAttributes}
        >
          <TrackIcon iconUrl={value.iconUrl} title={value.title} />
          <div className="track-title">{value.title}</div>
          <div className="count">
            {pluralizeWithNumber(value.numSubmissions, countText)}
          </div>
          <Icon
            icon="chevron-down"
            alt="Click to change"
            className="action-icon"
          />
        </button>
      </ResultsZone>
      {isOpen ? (
        <div {...panelAttributes} className="--options">
          <ul>
            {tracks.map((track) => {
              return (
                <li key={track.slug}>
                  <TrackFilter
                    countText={countText}
                    onChange={() => {
                      setValue(track)
                      close()
                    }}
                    checked={value.slug === track.slug}
                    {...track}
                  />
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
