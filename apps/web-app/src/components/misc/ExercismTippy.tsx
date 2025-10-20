'use client'

import React from 'react'
import Tippy, { TippyProps } from '@tippyjs/react'
import 'tippy.js/dist/tippy.css'

interface ExercismTippyProps extends Omit<TippyProps, 'children'> {
  interactive?: boolean
  renderReactComponents?: boolean
  content: React.ReactNode
  reference: HTMLElement
}

/**
 * Exercism-specific Tippy wrapper component
 * Provides consistent tooltip behavior across the application
 */
export function ExercismTippy({
  interactive = false,
  renderReactComponents = false,
  content,
  reference,
  ...props
}: ExercismTippyProps): JSX.Element {
  return (
    <Tippy
      content={content}
      interactive={interactive}
      allowHTML={true}
      placement="top"
      theme="exercism"
      {...props}
    >
      <span ref={(ref) => {
        if (ref && reference) {
          // Attach tippy to the reference element
          reference.setAttribute('data-tippy-content', 'true')
        }
      }} />
    </Tippy>
  )
}

export default ExercismTippy