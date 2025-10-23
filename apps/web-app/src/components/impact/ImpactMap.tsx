import React from 'react'
import { Metric } from '../types'

interface ImpactMapProps {
  initialMetrics: Metric[]
  trackTitle?: string
}

// Utility function for coordinate conversion - keeping for future use
// const coordinatesToPosition = (latitude: number, longitude: number) => {
//   const map_width = 724
//   const map_height = 421

//   const x = (longitude + 180) * (map_width / 360)
//   const last_rad = (latitude * Math.PI) / 180
//   const merc_north = Math.log(Math.tan(Math.PI / 4 + last_rad / 2))
//   const y = map_height / 2 - (map_width * merc_north) / (2 * Math.PI)

//   const left = ((x - 15) / map_width) * 100
//   const top = ((y + 62) / map_height) * 100
//   return [left, top]
// }

/*
// Unused component - keeping for future use
const _MetricPoint = ({ metric }: { metric: Metric }) => {
  const [left, top] = coordinatesToPosition(
    metric.coordinates[0],
    metric.coordinates[1]
  )

  const renderMetricContent = () => {
    switch (metric.type) {
      case 'sign_up_metric':
        return (
          <div className="relative border-2 border-gradient rounded-circle translate-y-[-50%] translate-x-[-50%]">
            <GraphicalIcon
              icon="avatar-placeholder"
              className="w-[32px] h-[32px]"
            />
          </div>
        )
      case 'start_solution_metric':
      case 'submit_submission_metric':
        return (
          <TrackIcon
            iconUrl={metric.track?.iconUrl || ''}
            title={metric.track?.title || ''}
            className="w-[32px] h-[32px] translate-y-[-50%] translate-x-[-50%]"
          />
        )
      case 'publish_solution_metric':
      case 'open_issue_metric':
      case 'open_pull_request_metric':
      case 'merge_pull_request_metric':
        return (
          <div className="relative border-2 border-gradient rounded-circle translate-y-[-50%] translate-x-[-50%]">
            <Avatar
              user={{
                avatarUrl: metric.user?.avatarUrl || '',
                handle: metric.user?.handle || ''
              }}
              size="medium"
              className="w-[32px] h-[32px]"
            />
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div
      style={{ left: `${left}%`, top: `${top}%` }}
      className={`map-point absolute metric-${metric.type}`}
    >
      {renderMetricContent()}
    </div>
  )
}
*/

export function ImpactMap({ initialMetrics, trackTitle }: ImpactMapProps) {
  // Use the sophisticated Map component with real-time WebSocket updates
  const Map = React.lazy(() => import('./map'))
  return (
    <React.Suspense fallback={<div>Loading map...</div>}>
      <Map initialMetrics={initialMetrics} {...(trackTitle && { trackTitle })} />
    </React.Suspense>
  )
}