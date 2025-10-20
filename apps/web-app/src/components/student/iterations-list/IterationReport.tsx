import React from 'react'
import { Iteration } from '../../../types'

interface IterationReportProps {
  iteration: Iteration
}

export function IterationReport({ iteration }: IterationReportProps): React.JSX.Element {
  return (
    <div className="iteration-report">
      <div className="iteration-header">
        <h4>Iteration {iteration.idx}</h4>
        <div className="status-badges">
          <span className={`badge ${iteration.testsStatus}`}>
            Tests: {iteration.testsStatus}
          </span>
          <span className={`badge ${iteration.representationStatus}`}>
            Representation: {iteration.representationStatus}
          </span>
          <span className={`badge ${iteration.analysisStatus}`}>
            Analysis: {iteration.analysisStatus}
          </span>
        </div>
      </div>
      
      <div className="iteration-meta">
        <span>Created: {new Date(iteration.createdAt).toLocaleDateString()}</span>
        {iteration.isPublished && <span className="published">Published</span>}
      </div>

      <div className="iteration-files">
        {iteration.files.map((file) => (
          <div key={file.filename} className="file-preview">
            <h5>{file.filename}</h5>
            <pre className="code-preview">
              <code>{file.content.slice(0, 200)}...</code>
            </pre>
          </div>
        ))}
      </div>
    </div>
  )
}

export default IterationReport