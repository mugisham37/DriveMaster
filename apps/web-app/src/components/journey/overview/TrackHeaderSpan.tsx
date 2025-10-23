import React from 'react'

export const TrackHeaderSpan = ({
  slug,
  children,
}: React.PropsWithChildren<{ slug: string }>): React.JSX.Element => {
  const classNames = ['track', `t-b-${slug}`]

  return <span className={classNames.join(' ')}>{children}</span>
}
