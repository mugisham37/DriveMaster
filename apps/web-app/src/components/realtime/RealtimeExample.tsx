/**
 * Example component demonstrating the use of migrated real-time channels
 * This shows how to integrate the channels into React components
 */

'use client'

import React from 'react'
import { 
  useAIHelpRecords,
  useIteration,
  useLatestIterationStatus,
  useMentorRequest,
  useMetrics,
  useReputation,
  useSolution,
  useSolutionWithLatestIteration,
  useTestRun
} from '@/lib/realtime'

interface RealtimeExampleProps {
  submissionUuid?: string
  iterationUuid?: string
  solutionUuid?: string
  mentorRequestUuid?: string
  testRunSubmissionUuid?: string
}

export function RealtimeExample({
  submissionUuid = 'example-submission-uuid',
  iterationUuid = 'example-iteration-uuid',
  solutionUuid = 'example-solution-uuid',
  mentorRequestUuid = 'example-mentor-request-uuid',
  testRunSubmissionUuid = 'example-test-run-submission-uuid'
}: RealtimeExampleProps) {
  
  // Example usage of AI Help Records Channel
  const { helpRecords, isConnected: aiHelpConnected } = useAIHelpRecords(submissionUuid)
  
  // Example usage of Iteration Channel
  const { iteration, isConnected: iterationConnected } = useIteration(iterationUuid)
  
  // Example usage of Latest Iteration Status Channel
  const { status, isConnected: statusConnected } = useLatestIterationStatus(iterationUuid)
  
  // Example usage of Mentor Request Channel
  const { requestStatus, cancelRequest, isConnected: mentorConnected } = useMentorRequest({
    uuid: mentorRequestUuid,
    status: 'pending',
    trackSlug: 'javascript',
    exerciseSlug: 'hello-world',
    studentHandle: 'student-handle',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })
  
  // Example usage of Metrics Channel
  const { metrics, sendMetric, isConnected: metricsConnected } = useMetrics()
  
  // Example usage of Reputation Channel
  const { reputationUpdated, isConnected: reputationConnected } = useReputation()
  
  // Example usage of Solution Channel
  const { solutionData, publishSolution, unpublishSolution, isConnected: solutionConnected } = useSolution({
    uuid: solutionUuid,
    status: 'started'
  })
  
  // Example usage of Solution With Latest Iteration Channel
  const { solutionData: solutionWithIteration, isConnected: solutionIterationConnected } = useSolutionWithLatestIteration({
    uuid: solutionUuid,
    status: 'started'
  })
  
  // Example usage of Test Run Channel
  const { testRunData, cancelTestRun, isConnected: testRunConnected } = useTestRun({
    id: 'test-run-id',
    uuid: 'test-run-uuid',
    submissionUuid: testRunSubmissionUuid,
    status: 'queued',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })

  const handleSendMetric = () => {
    sendMetric({
      id: `metric-${Date.now()}`,
      type: 'user_activity_metric',
      createdAt: new Date().toISOString(),
      value: 1
    })
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold mb-4">Real-time Channels Status</h2>
      
      {/* Connection Status Overview */}
      <div className="grid grid-cols-3 gap-4">
        <div className={`p-4 rounded-lg ${aiHelpConnected ? 'bg-green-100' : 'bg-red-100'}`}>
          <h3 className="font-semibold">AI Help Records</h3>
          <p className="text-sm">{aiHelpConnected ? 'Connected' : 'Disconnected'}</p>
          <p className="text-xs">{helpRecords.length} records</p>
        </div>
        
        <div className={`p-4 rounded-lg ${iterationConnected ? 'bg-green-100' : 'bg-red-100'}`}>
          <h3 className="font-semibold">Iteration</h3>
          <p className="text-sm">{iterationConnected ? 'Connected' : 'Disconnected'}</p>
          <p className="text-xs">{iteration ? `Iteration ${iteration.idx}` : 'No iteration'}</p>
        </div>
        
        <div className={`p-4 rounded-lg ${statusConnected ? 'bg-green-100' : 'bg-red-100'}`}>
          <h3 className="font-semibold">Iteration Status</h3>
          <p className="text-sm">{statusConnected ? 'Connected' : 'Disconnected'}</p>
          <p className="text-xs">{status?.status || 'No status'}</p>
        </div>
        
        <div className={`p-4 rounded-lg ${mentorConnected ? 'bg-green-100' : 'bg-red-100'}`}>
          <h3 className="font-semibold">Mentor Request</h3>
          <p className="text-sm">{mentorConnected ? 'Connected' : 'Disconnected'}</p>
          <p className="text-xs">{requestStatus?.mentorRequest.status || 'No status'}</p>
        </div>
        
        <div className={`p-4 rounded-lg ${metricsConnected ? 'bg-green-100' : 'bg-red-100'}`}>
          <h3 className="font-semibold">Metrics</h3>
          <p className="text-sm">{metricsConnected ? 'Connected' : 'Disconnected'}</p>
          <p className="text-xs">{metrics.length} metrics</p>
        </div>
        
        <div className={`p-4 rounded-lg ${reputationConnected ? 'bg-green-100' : 'bg-red-100'}`}>
          <h3 className="font-semibold">Reputation</h3>
          <p className="text-sm">{reputationConnected ? 'Connected' : 'Disconnected'}</p>
          <p className="text-xs">{reputationUpdated ? 'Updated!' : 'No updates'}</p>
        </div>
        
        <div className={`p-4 rounded-lg ${solutionConnected ? 'bg-green-100' : 'bg-red-100'}`}>
          <h3 className="font-semibold">Solution</h3>
          <p className="text-sm">{solutionConnected ? 'Connected' : 'Disconnected'}</p>
          <p className="text-xs">{solutionData?.solution.status || 'No status'}</p>
        </div>
        
        <div className={`p-4 rounded-lg ${solutionIterationConnected ? 'bg-green-100' : 'bg-red-100'}`}>
          <h3 className="font-semibold">Solution + Iteration</h3>
          <p className="text-sm">{solutionIterationConnected ? 'Connected' : 'Disconnected'}</p>
          <p className="text-xs">{solutionWithIteration ? 'Has data' : 'No data'}</p>
        </div>
        
        <div className={`p-4 rounded-lg ${testRunConnected ? 'bg-green-100' : 'bg-red-100'}`}>
          <h3 className="font-semibold">Test Run</h3>
          <p className="text-sm">{testRunConnected ? 'Connected' : 'Disconnected'}</p>
          <p className="text-xs">{testRunData?.status || 'No status'}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Actions</h3>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleSendMetric}
            disabled={!metricsConnected}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            Send Metric
          </button>
          
          <button
            onClick={cancelRequest}
            disabled={!mentorConnected}
            className="px-4 py-2 bg-red-500 text-white rounded disabled:bg-gray-300"
          >
            Cancel Mentor Request
          </button>
          
          <button
            onClick={publishSolution}
            disabled={!solutionConnected}
            className="px-4 py-2 bg-green-500 text-white rounded disabled:bg-gray-300"
          >
            Publish Solution
          </button>
          
          <button
            onClick={unpublishSolution}
            disabled={!solutionConnected}
            className="px-4 py-2 bg-yellow-500 text-white rounded disabled:bg-gray-300"
          >
            Unpublish Solution
          </button>
          
          <button
            onClick={cancelTestRun}
            disabled={!testRunConnected}
            className="px-4 py-2 bg-red-500 text-white rounded disabled:bg-gray-300"
          >
            Cancel Test Run
          </button>
        </div>
      </div>

      {/* Recent Data */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Recent Data</h3>
        
        {helpRecords.length > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium">Latest AI Help Record</h4>
            <pre className="text-xs mt-2 overflow-auto">
              {JSON.stringify(helpRecords[0], null, 2)}
            </pre>
          </div>
        )}
        
        {metrics.length > 0 && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium">Latest Metric</h4>
            <pre className="text-xs mt-2 overflow-auto">
              {JSON.stringify(metrics[0], null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}