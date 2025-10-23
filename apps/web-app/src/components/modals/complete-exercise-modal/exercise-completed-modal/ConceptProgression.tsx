import React from 'react'
import { ConceptIcon } from '../../../common/ConceptIcon'

export const ConceptProgression = ({
  name,
  links,
}: {
  name: string
  links: { self: string }
}): React.JSX.Element => {
  return (
    <a href={links.self} className="concept">
      <ConceptIcon name={name} size="medium" />
      <div className="name">{name}</div>
      <div className="exercises">
        <div className="c-ed --completed --concept" />
      </div>
    </a>
  )
}
