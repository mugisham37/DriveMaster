import React from 'react'

interface SplitPaneProps {
  id: string
  defaultLeftWidth: string
  leftMinWidth: number
  rightMinWidth: number
  left: React.ReactNode
  right: React.ReactNode
}

export function SplitPane({
  id,
  defaultLeftWidth,
  leftMinWidth,
  rightMinWidth,
  left,
  right
}: SplitPaneProps) {
  return (
    <div id={id} className="split-pane">
      <div 
        className="left-pane" 
        style={{ 
          width: defaultLeftWidth, 
          minWidth: `${leftMinWidth}px` 
        }}
      >
        {left}
      </div>
      <div 
        className="right-pane" 
        style={{ 
          minWidth: `${rightMinWidth}px` 
        }}
      >
        {right}
      </div>
    </div>
  )
}