import React, { useState, useRef, useCallback } from 'react'

interface SplitPaneProps {
  left: React.ReactNode
  right: React.ReactNode
  defaultLeftWidth?: string
  leftMinWidth?: number
  rightMinWidth?: number
  id?: string
  className?: string
}

export function SplitPane({
  left,
  right,
  defaultLeftWidth = '50%',
  leftMinWidth = 200,
  rightMinWidth = 200,
  id,
  className = ''
}: SplitPaneProps): React.JSX.Element {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth)
  const [isDragging, setIsDragging] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback(() => {
    setIsDragging(true)
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return

    const containerRect = containerRef.current.getBoundingClientRect()
    const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100
    
    const minLeftPercent = (leftMinWidth / containerRect.width) * 100
    const maxLeftPercent = 100 - (rightMinWidth / containerRect.width) * 100
    
    const clampedWidth = Math.max(minLeftPercent, Math.min(maxLeftPercent, newLeftWidth))
    setLeftWidth(`${clampedWidth}%`)
  }, [isDragging, leftMinWidth, rightMinWidth])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  return (
    <div 
      ref={containerRef}
      id={id}
      className={`split-pane flex h-full ${className}`}
    >
      <div 
        className="split-pane-left overflow-auto"
        style={{ width: leftWidth }}
      >
        {left}
      </div>
      
      <div 
        className="split-pane-divider w-1 bg-gray-300 cursor-col-resize hover:bg-gray-400 transition-colors"
        onMouseDown={handleMouseDown}
      />
      
      <div 
        className="split-pane-right flex-1 overflow-auto"
      >
        {right}
      </div>
    </div>
  )
}