'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { GraphicalIcon } from './GraphicalIcon'
import { useAuth } from '@/hooks/useAuth'

interface Iteration {
  idx: number
  uuid: string
  submissionUuid: string
  createdAt: string
  testsStatus: string
  representationStatus: string
  analysisStatus: string
  isPublished: boolean
  files: Array<{
    filename: string
    content: string
  }>
  links: {
    self: string
    tests: string
    delete?: string
  }
}

interface SolutionViewProps {
  iterations: Iteration[]
  language: string
  indentSize: number
  outOfDate: boolean
  publishedIterationIdx?: number
  publishedIterationIdxs: number[]
  links: {
    changeIteration?: string
    unpublish?: string
  }
  className?: string
}

export function SolutionView({
  iterations,
  language,
  indentSize,
  outOfDate,
  publishedIterationIdx,
  publishedIterationIdxs,
  links,
  className = ''
}: SolutionViewProps): React.JSX.Element {
  const { user } = useAuth()
  const [selectedIterationIdx, setSelectedIterationIdx] = useState(
    publishedIterationIdx || iterations[iterations.length - 1]?.idx || 1
  )
  const codeRef = useRef<HTMLPreElement>(null)

  const selectedIteration = iterations.find(iter => iter.idx === selectedIterationIdx)

  const handleIterationChange = useCallback(async (iterationIdx: number) => {
    setSelectedIterationIdx(iterationIdx)

    if (links.changeIteration && user) {
      try {
        await fetch(links.changeIteration, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ iteration_idx: iterationIdx })
        })
      } catch (error) {
        console.error('Failed to change iteration:', error)
      }
    }
  }, [links.changeIteration, user])

  const handleUnpublish = useCallback(async () => {
    if (!links.unpublish || !user) return

    try {
      const response = await fetch(links.unpublish, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (response.ok) {
        // Refresh the page or update state
        window.location.reload()
      }
    } catch (error) {
      console.error('Failed to unpublish solution:', error)
    }
  }, [links.unpublish, user])

  useEffect(() => {
    // Apply syntax highlighting here if needed
    // For now, we'll skip the highlighting implementation
  }, [selectedIteration, language])

  if (!selectedIteration) {
    return <div className="solution-view-error">No iteration found</div>
  }

  return (
    <div className={`solution-view ${className}`}>
      {outOfDate && (
        <div className="solution-view-warning">
          <GraphicalIcon icon="warning" />
          <span>This solution is out of date with the current exercise version</span>
        </div>
      )}

      <div className="solution-view-header">
        <div className="iteration-selector">
          <label htmlFor="iteration-select">Iteration:</label>
          <select
            id="iteration-select"
            value={selectedIterationIdx}
            onChange={(e) => handleIterationChange(Number(e.target.value))}
            className="iteration-select"
          >
            {iterations.map((iteration) => (
              <option key={iteration.idx} value={iteration.idx}>
                Iteration {iteration.idx}
                {publishedIterationIdxs.includes(iteration.idx) && ' (Published)'}
              </option>
            ))}
          </select>
        </div>

        {user && links.unpublish && publishedIterationIdxs.includes(selectedIterationIdx) && (
          <button
            type="button"
            onClick={handleUnpublish}
            className="unpublish-button"
            title="Unpublish this solution"
          >
            <GraphicalIcon icon="unpublish" />
            <span>Unpublish</span>
          </button>
        )}
      </div>

      <div className="solution-view-content">
        {selectedIteration.files.map((file) => (
          <div key={file.filename} className="solution-file">
            <div className="solution-file-header">
              <span className="solution-file-name">{file.filename}</span>
            </div>
            <pre ref={codeRef} className="solution-file-content">
              <code 
                className={`language-${language}`}
                style={{ tabSize: indentSize }}
              >
                {file.content}
              </code>
            </pre>
          </div>
        ))}
      </div>

      <div className="solution-view-footer">
        <div className="iteration-info">
          <span>Created: {new Date(selectedIteration.createdAt).toLocaleDateString()}</span>
          <span>Tests: {selectedIteration.testsStatus}</span>
          {selectedIteration.isPublished && (
            <span className="published-badge">
              <GraphicalIcon icon="published" />
              Published
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default SolutionView
