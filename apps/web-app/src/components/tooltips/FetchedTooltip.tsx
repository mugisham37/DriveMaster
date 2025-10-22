import React from 'react'
import { usePaginatedRequestQuery } from '../../hooks/request-query'

interface FetchedTooltipProps {
  endpoint: string
  className?: string
  loadingAlt?: string
  LoadingComponent?: React.ReactNode
  defaultError?: Error
  children?: React.ReactNode
}

export function FetchedTooltip({
  endpoint,
  className = '',
  loadingAlt = 'Loading...',
  LoadingComponent = <div>{loadingAlt}</div>,
  defaultError = new Error('Unable to load data'),
  children,
}: FetchedTooltipProps): React.JSX.Element {
  const { data, error, isLoading } = usePaginatedRequestQuery(
    [endpoint],
    { endpoint }
  )

  if (isLoading) {
    return <div className={className}>{LoadingComponent}</div>
  }

  if (error) {
    return (
      <div className={className}>
        <div className="error">
          {defaultError.message}
        </div>
      </div>
    )
  }

  if (data && children) {
    return <div className={className}>{children}</div>
  }

  return (
    <div className={className}>
      {data ? (
        <div dangerouslySetInnerHTML={{ __html: data.html || '' }} />
      ) : (
        <div>No data available</div>
      )}
    </div>
  )
}