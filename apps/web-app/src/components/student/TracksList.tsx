import React, { useCallback, useState, useEffect } from 'react'
import { Request, usePaginatedRequestQuery } from '../../hooks/request-query'
import { TagsFilter } from './tracks-list/TagsFilter'
import { List } from './tracks-list/List'
import { ResultsZone } from '../ResultsZone'
import { useList } from '../../hooks/use-list'
import { StudentTrack } from '../../types'
import { useHistory, removeEmpty } from '../../hooks/use-history'
import { OrderSelect } from './tracks-list/OrderSelect'

type APIResponse = {
  tracks: StudentTrack[]
}

export type TagOption = {
  category: string
  options: {
    value: string
    label: string
  }[]
}

export type Order = 'last_touched_first'

const TracksList = ({
  tagOptions,
  request: initialRequest,
}: {
  tagOptions: readonly TagOption[]
  request: Request
}): React.JSX.Element => {
  const {
    request,
    setCriteria: setRequestCriteria,
    setQuery,
  } = useList(initialRequest)
  const [criteria, setCriteria] = useState<string>(request.query?.criteria as string || '')
  const CACHE_KEY = ['track-list', request.endpoint || '', JSON.stringify(request.query || {})]
  const {
    data: resolvedData,
    isError,
    isFetching,
  } = usePaginatedRequestQuery<APIResponse>(CACHE_KEY, request as Request<APIResponse>)

  const setTags = useCallback(
    (tags: string[]) => {
      setQuery({ ...(request.query || {}), tags: tags })
    },
    [request.query, setQuery]
  )



  const sortedTracks = resolvedData?.tracks?.sort((a: StudentTrack, b: StudentTrack) => {
    const aLastTouched = (a as StudentTrack & { lastTouchedAt?: string }).lastTouchedAt
    const bLastTouched = (b as StudentTrack & { lastTouchedAt?: string }).lastTouchedAt
    
    if (!aLastTouched || !bLastTouched) {
      return 0
    }

    return aLastTouched > bLastTouched ? -1 : 1
  })

  useHistory({ pushOn: removeEmpty(request.query || {}) })

  useEffect(() => {
    const handler = setTimeout(() => {
      if (criteria === undefined || criteria === null) return
      setRequestCriteria(criteria)
    }, 200)

    return () => {
      clearTimeout(handler)
    }
  }, [setRequestCriteria, criteria])

  return (
    <div className="tracks-list">
      <section className="c-search-bar">
        <div className="lg-container container">
          <input
            type="text"
            placeholder="Search language tracks"
            className="--search"
            onChange={(e) => setCriteria(e.target.value)}
            value={criteria}
          />
          <TagsFilter
            tags={tagOptions.flatMap(option => option.options.map(opt => opt.value))}
            selectedTags={((request.query?.tags as string[]) || [])}
            onTagsChange={setTags}
          />
          <OrderSelect 
            value="last_touched_first" 
            onChange={() => null}
            options={[{ value: "last_touched_first", label: "Last Touched First" }]}
          />
        </div>
      </section>
      <section className="lg-container container">
        {isError && <p>Something went wrong</p>}
        {resolvedData && (
          <ResultsZone isFetching={isFetching}>
            {sortedTracks ? (
              <List tracks={sortedTracks} />
            ) : null}
          </ResultsZone>
        )}
      </section>
    </div>
  )
}

export default TracksList