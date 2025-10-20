import React from 'react'

interface StartExerciseButtonProps {
  endpoint: string
  className?: string | undefined
  onClick?: () => void
  disabled?: boolean
  children?: React.ReactNode
}

export function StartExerciseButton({ 
  endpoint,
  className,
  onClick, 
  disabled = false, 
  children 
}: StartExerciseButtonProps): React.JSX.Element {
  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      // Default behavior: navigate to endpoint
      window.location.href = endpoint
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`btn-primary start-exercise-button ${className || ''}`}
    >
      {children || 'Start Exercise'}
    </button>
  )
}

export default StartExerciseButton