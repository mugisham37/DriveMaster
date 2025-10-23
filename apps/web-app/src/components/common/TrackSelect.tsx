import React from 'react'
import { TrackIcon } from './TrackIcon'

export interface TrackOption {
  slug: string
  title: string
  iconUrl: string
}

export interface TrackLogoProps {
  track: TrackOption
  className?: string
}

export function TrackLogo({ track, className }: TrackLogoProps): React.JSX.Element {
  return (
    <TrackIcon 
      iconUrl={track.iconUrl} 
      title={track.title} 
      className={className}
    />
  )
}

export interface TrackSelectProps<T = TrackOption> {
  value?: T
  setValue: (track: T) => void
  tracks: T[]
  placeholder?: string
  className?: string
  disabled?: boolean
  size?: string
  SelectedComponent?: React.ComponentType<{ option: T }>
  OptionComponent?: React.ComponentType<{ option: T }>
}

export function TrackSelect<T = TrackOption>({ 
  value, 
  setValue, 
  tracks, 
  placeholder = "Select a track...",
  className = "",
  disabled = false,
  SelectedComponent,
  OptionComponent
}: TrackSelectProps<T>): React.JSX.Element {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedIndex = parseInt(e.target.value, 10)
    if (!isNaN(selectedIndex) && tracks[selectedIndex]) {
      setValue(tracks[selectedIndex])
    }
  }

  const selectedIndex = tracks.findIndex(track => track === value)

  return (
    <div className={`track-select ${className}`}>
      {SelectedComponent && value && <SelectedComponent option={value} />}
      <select 
        value={selectedIndex >= 0 ? selectedIndex : ""} 
        onChange={handleChange}
        disabled={disabled}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {tracks.map((track, index) => (
          <option key={index} value={index}>
            {OptionComponent ? (
              <OptionComponent option={track} />
            ) : (
              (track as any)?.title || String(track)
            )}
          </option>
        ))}
      </select>
      
      {value && !SelectedComponent && (
        <div className="selected-track-preview">
          <TrackIcon iconUrl={(value as any).iconUrl} title={(value as any).title} />
          <span>{(value as unknown).title}</span>
        </div>
      )}
    </div>
  )
}

export default TrackSelect