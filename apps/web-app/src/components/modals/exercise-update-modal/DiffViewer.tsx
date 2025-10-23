import React from 'react'

export const DiffViewer = ({ diff }: { diff: string }): React.JSX.Element => {
  // Simple diff viewer - in a real implementation, this would use a proper diff library
  const lines = diff.split('\n')
  
  return (
    <div className="c-diff">
      <div className="diff-content">
        <pre className="diff-text">
          {lines.map((line, index) => (
            <div 
              key={index} 
              className={`diff-line ${
                line.startsWith('+') ? 'added' : 
                line.startsWith('-') ? 'removed' : 
                line.startsWith('@@') ? 'header' : 'context'
              }`}
            >
              {line}
            </div>
          ))}
        </pre>
      </div>
    </div>
  )
}