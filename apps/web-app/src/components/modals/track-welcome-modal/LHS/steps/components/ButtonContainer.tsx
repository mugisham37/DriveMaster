import React from 'react'

export function ButtonContainer({
  children,
}: {
  children: React.ReactNode
}): React.ReactElement {
  return (
    <div className="flex gap-12 items-center content-stretch">{children}</div>
  )
}
