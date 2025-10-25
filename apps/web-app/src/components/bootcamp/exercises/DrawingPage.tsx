'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { BootcampDrawing, BootcampBackground } from '@/types/bootcamp'
import { useJikiscriptExecution } from '@/hooks/useJikiscriptExecution'

interface DrawingPageProps {
  drawing: BootcampDrawing
  code: {
    code: string
    stored_at: string
  }
  backgrounds: BootcampBackground[]
  links: {
    update_code: string
    drawings_index: string
  }
}

export function DrawingPage({
  drawing,
  code,
  backgrounds,
  links
}: DrawingPageProps) {
  const [drawingCode, setDrawingCode] = useState(code.code || '')
  const [selectedBackground, setSelectedBackground] = useState(drawing.background_slug)
  const [isSaving, setIsSaving] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Initialize Jikiscript interpreter with drawing functions
  const canvasContext = canvasRef.current?.getContext('2d')
  const {
    executeJikiscript,
    isExecuting,
    executionResult,
    lastError,
    clearCanvas
  } = useJikiscriptExecution(canvasContext ? {
    canvasContext,
    enableDrawingFunctions: true,
    enableMathFunctions: true
  } : {
    enableDrawingFunctions: true,
    enableMathFunctions: true
  })

  const executeDrawingCode = useCallback(async () => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas first
    clearCanvas()

    // Set background if selected
    const background = backgrounds.find(bg => bg.slug === selectedBackground)
    if (background && background.image_url) {
      const img = new Image()
      img.onload = async () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        await executeUserCode()
      }
      img.src = background.image_url
    } else {
      await executeUserCode()
    }
  }, [drawingCode, selectedBackground, backgrounds, clearCanvas])

  // Execute drawing code when it changes
  useEffect(() => {
    executeDrawingCode()
  }, [drawingCode, selectedBackground, executeDrawingCode, executeUserCode])

  const executeUserCode = useCallback(async () => {
    if (!drawingCode.trim()) return

    try {
      // Execute the drawing code using the Jikiscript interpreter
      await executeJikiscript(drawingCode)
    } catch (error) {
      console.error('Drawing code execution error:', error)
      
      // Display error on canvas
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (ctx) {
        ctx.fillStyle = 'red'
        ctx.font = '16px Arial'
        ctx.fillText('Error in drawing code:', 10, 30)
        ctx.fillText(error instanceof Error ? error.message : String(error), 10, 50)
      }
    }
  }, [drawingCode, executeJikiscript])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const response = await fetch(links.update_code, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: drawingCode,
          background_slug: selectedBackground
        })
      })

      if (response.ok) {
        console.log('Drawing saved successfully')
      }
    } catch (error) {
      console.error('Save failed:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div id="bootcamp-drawing-page" className="drawing-page">
      <div className="drawing-header">
        <h1>{drawing.title}</h1>
        <div className="drawing-actions">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary"
          >
            {isSaving ? 'Saving...' : 'Save Drawing'}
          </button>
          <a 
            href={links.drawings_index}
            className="btn-secondary"
          >
            Back to Drawings
          </a>
        </div>
      </div>

      <div className="drawing-body">
        <div className="drawing-controls">
          <div className="background-selector">
            <h3>Background</h3>
            <select 
              value={selectedBackground}
              onChange={(e) => setSelectedBackground(e.target.value)}
              className="background-select"
            >
              {backgrounds.map((bg) => (
                <option key={bg.slug} value={bg.slug}>
                  {bg.title}
                </option>
              ))}
            </select>
          </div>

          <div className="code-editor-section">
            <h3>Drawing Code</h3>
            <textarea
              value={drawingCode}
              onChange={(e) => setDrawingCode(e.target.value)}
              className="code-editor drawing-code-editor"
              rows={15}
              placeholder="// Write your drawing code here
// Available functions:
// draw.drawLine(x1, y1, x2, y2)
// draw.drawRect(x, y, width, height)
// draw.fillRect(x, y, width, height)
// draw.drawCircle(x, y, radius)
// draw.fillCircle(x, y, radius)
// draw.setColor(color)
// draw.setLineWidth(width)

draw.setColor('blue')
draw.drawCircle(100, 100, 50)"
            />
          </div>
        </div>

        <div className="drawing-canvas-section">
          <h3>Canvas</h3>
          <div className="canvas-container">
            <canvas
              ref={canvasRef}
              width={600}
              height={400}
              className="drawing-canvas"
            />
            
            {isExecuting && (
              <div className="execution-overlay">
                <p>Executing drawing code...</p>
              </div>
            )}
            
            {lastError && (
              <div className="error-display" style={{ color: 'red', marginTop: '0.5rem' }}>
                <strong>Error:</strong> {lastError.message}
              </div>
            )}
            
            {executionResult && (
              <div className="execution-info" style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: '#666' }}>
                <p>Drawing executed successfully</p>
                {executionResult.frames && (
                  <p>Executed {executionResult.frames.length} drawing commands</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="drawing-info">
        <p>Last saved: {new Date(code.stored_at).toLocaleString()}</p>
        <p>Drawing ID: {drawing.uuid}</p>
      </div>
    </div>
  )
}