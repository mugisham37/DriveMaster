import React, { forwardRef } from 'react'
import { ExerciseStatus } from '../../types'
import { ExerciseTooltip } from '../tooltips'
import { GenericTooltip } from '../misc/ExercismTippy'
import { JSX } from 'react/jsx-runtime'

export default function ExerciseStatusDot({
  exerciseStatus,
  type,
  links,
}: {
  exerciseStatus: ExerciseStatus
  type: string
  links: {
    tooltip: string
    exercise?: string
  }
}): JSX.Element {
  return (
    <GenericTooltip content={<ExerciseTooltip endpoint={links.tooltip} />}>
      <ReferenceElement
        className={`c-ed --${exerciseStatus} --${type}`}
        link={links.exercise}
        status={exerciseStatus}
      />
    </GenericTooltip>
  )
}

const ReferenceElement = forwardRef<
  HTMLElement,
  React.HTMLProps<HTMLDivElement> &
    React.HTMLProps<HTMLAnchorElement> & {
      link?: string
      status: ExerciseStatus
    }
>(({ link, status, ...props }, ref) => {
  return link ? (
    <a
      href={link}
      onClick={(e) => {
        if (status === 'locked') {
          e.preventDefault()
        }
      }}
      ref={ref as React.RefObject<HTMLAnchorElement>}
      {...props}
    />
  ) : (
    <div ref={ref as React.RefObject<HTMLDivElement>} {...props} />
  )
})