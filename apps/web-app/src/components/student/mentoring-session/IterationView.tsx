import React, { Dispatch, SetStateAction } from 'react'
import { Iteration, MentorDiscussion } from '../../../types'

interface IterationViewProps {
  iterations: Iteration[]
  currentIteration: Iteration | undefined
  onClick: (idx: number) => void
  language: string
  indentSize: number
  isOutOfDate: boolean
  isLinked: boolean
  setIsLinked: Dispatch<SetStateAction<boolean>>
  discussion?: MentorDiscussion | undefined
}

export function IterationView({ 
  iterations, 
  currentIteration, 
  onClick, 
  language, 
  indentSize, 
  isOutOfDate, 
  isLinked, 
  setIsLinked 
}: IterationViewProps): React.JSX.Element {
  return (
    <div className="iteration-view-container">
      <div className="iteration-controls">
        <label>
          <input
            type="checkbox"
            checked={isLinked}
            onChange={(e) => setIsLinked(e.target.checked)}
          />
          Link iterations
        </label>
        {isOutOfDate && (
          <div className="out-of-date-notice">
            This iteration is out of date
          </div>
        )}
      </div>
      
      <div className="iterations-list">
        {iterations.map((iteration, idx) => (
          <div 
            key={iteration.idx}
            id={`iteration-${iteration.idx}`}
            className={`iteration-view ${currentIteration?.idx === iteration.idx ? 'active' : ''}`}
            onClick={() => onClick(idx)}
          >
            <div className="iteration-header">
              <h4>Iteration {iteration.idx}</h4>
              <span className="status">{iteration.testsStatus}</span>
            </div>
            <div className="iteration-files">
              {iteration.files?.map((file) => (
                <div key={file.filename} className="file">
                  <h5>{file.filename}</h5>
                  <pre style={{ tabSize: indentSize }}>
                    <code className={`language-${language}`}>
                      {file.content}
                    </code>
                  </pre>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default IterationView