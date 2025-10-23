import React from 'react'
import { GraphicalIcon } from '../../../common'

export const Checkbox = ({
  children,
  onChange,
}: {
  children: React.ReactNode
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}): React.JSX.Element => {
  return (
    <label className="c-checkbox-wrapper">
      <input onChange={onChange} required type="checkbox" />
      <div className="row">
        <div className="c-checkbox">
          <GraphicalIcon icon="checkmark" />
        </div>
        {children}
      </div>
    </label>
  )
}
