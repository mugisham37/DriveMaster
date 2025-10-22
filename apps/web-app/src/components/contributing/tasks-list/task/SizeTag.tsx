import React from 'react'
import { TaskSize } from '../../../types'

interface SizeTagProps {
  size: TaskSize
}

export function SizeTag({ size }: SizeTagProps): React.JSX.Element {
  const getSizeClass = (size: TaskSize): string => {
    switch (size) {
      case 'tiny':
        return 'size-tiny'
      case 'small':
        return 'size-small'
      case 'medium':
        return 'size-medium'
      case 'large':
        return 'size-large'
      case 'massive':
        return 'size-massive'
      default:
        return 'size-unknown'
    }
  }

  return (
    <span className={`size-tag ${getSizeClass(size)}`}>
      {size}
    </span>
  )
}