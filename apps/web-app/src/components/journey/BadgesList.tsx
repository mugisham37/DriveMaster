import React, { useState, useEffect } from 'react'
import { scrollToTop } from '@/utils/scroll-to-top'
import { usePaginatedRequestQuery, type Request } from '@/hooks/request-query'
import { useHistory, removeEmpty } from '@/hooks/use-history'
import { useList } from '@/hooks/use-list'
import { ResultsZone } from '@/components/common/ResultsZone'
import { Pagination } from '@/components/common'
import { FetchingBoundary } from '@/components/common/FetchingBoundary'
import { BadgeResults } from './BadgeResults'
import { OrderSwitcher } from './badges-list/OrderSwitcher'
import type { PaginatedResult, Badge } from '../types'
import { useAppTranslation } from '@/i18n/useAppTranslation'
import type { Order } from './BadgeResults'

const DEFAULT_ORDER = 'unrevealed_first'
const DEFAULT_ERROR = new Error('Unable to load badge list')

export const BadgesList = ({
  request: initialRequest,
  isEnabled,
}: {
  request: Request
  isEnabled: boolean
}): React.ReactElement => {
  const { t } = useAppTranslation('components/journey')
  const {
    request,
    setPage,
    setCriteria: setRequestCriteria,
    setOrder,
  } = useList(initialRequest)
  const [criteria, setCriteria] = useState<string>(
    (request.query?.criteria as string) || ''
  )
  const cacheKey = [
    'badges-list',
    request.endpoint,
    JSON.stringify(removeEmpty(request.query || {})),
  ] as const
  const {
    status,
    data: resolvedData,
    isFetching,
    error,
  } = usePaginatedRequestQuery<PaginatedResult<Badge>>([...cacheKey], {
    ...request,
    query: removeEmpty(request.query || {}),
    options: { ...request.options, enabled: isEnabled },
  })

  useEffect(() => {
    const handler = setTimeout(() => {
      if (criteria === undefined || criteria === null) return
      setRequestCriteria(criteria)
    }, 200)

    return () => {
      clearTimeout(handler)
    }
  }, [setRequestCriteria, criteria])

  useHistory({ pushOn: removeEmpty(request.query || {}) })

  useEffect(() => {
    scrollToTop('badges-list')
  }, [])

  return (
    <article
      data-scroll-top-anchor="badges-list"
      className="badges-tab theme-dark"
    >
      <div className="md-container container">
        <div className="c-search-bar">
          <input
            className="--search"
            onChange={(e) => {
              setCriteria(e.target.value)
            }}
            value={criteria}
            placeholder={t('badgesList.searchByBadgeNameOrDescription')}
          />
          <OrderSwitcher
            value={(request.query?.order as Order) || DEFAULT_ORDER}
            setValue={setOrder}
          />
        </div>
        <ResultsZone isFetching={isFetching}>
          <FetchingBoundary
            status={status === 'pending' ? 'loading' : status}
            error={error}
            defaultError={DEFAULT_ERROR}
          >
            {resolvedData ? (
              <React.Fragment>
                <BadgeResults data={resolvedData} cacheKey={cacheKey} />
                <Pagination
                  current={(request.query?.page as number) || 1}
                  total={resolvedData.meta.totalPages}
                  setPage={(p) => {
                    setPage(p)
                    scrollToTop('badges-list')
                  }}
                />
              </React.Fragment>
            ) : null}
          </FetchingBoundary>
        </ResultsZone>
      </div>
    </article>
  )
}