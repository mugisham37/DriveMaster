import React from 'react'
import { SiteUpdate as SiteUpdateType, SiteUpdateContext } from '@/types'
import { SiteUpdate } from './site-updates-list/SiteUpdate'

interface SiteUpdatesListProps {
  updates: readonly SiteUpdateType[]
  context: SiteUpdateContext
}

export function SiteUpdatesList({
  updates,
  context,
}: SiteUpdatesListProps): React.JSX.Element {
  return (
    <div className="updates">
      {updates.map((update, i) => {
        return <SiteUpdate key={i} context={context} update={update} />
      })}
    </div>
  )
}
