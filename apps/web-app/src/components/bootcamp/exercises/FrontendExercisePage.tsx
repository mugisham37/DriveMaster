'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { BootcampExercise, BootcampSolution, BootcampCode, BootcampLinks, BootcampProject } from '@/types/bootcamp'

interface FrontendExercisePageProps {
  project?: BootcampProject
  exercise?: BootcampExercise
  solution?: BootcampSolution
  code: BootcampCode
  links: BootcampLinks
}

export function FrontendExercisePage({
  exercise,
  solution,
  code,
  links
}: Omit<FrontendExercisePageProps, 'project'>) {
  const [cssCode, setCssCode] = useState(code.stub?.css || '')
  const [htmlCode, setHtmlCode] = useState(code.stub?.html || '')
  const [jsCode, setJsCode] = useState(code.stub?.js || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const previewRef = useRef<HTMLIFrameElement>(null)

  const updatePreview = useCallback(() => {
    if (!previewRef.current) return

    const previewDocument = previewRef.current.contentDocument
    if (!previewDocument) return

    const fullHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            ${code.normalize_css || ''}
            ${cssCode}
          </style>
        </head>
        <body>
          ${htmlCode}
          <script>
            try {
              ${jsCode}
            } catch (error) {
              console.error('JavaScript Error:', error);
            }
          </script>
        </body>
      </html>
    `

    previewDocument.open()
    previewDocument.write(fullHTML)
    previewDocument.close()
  }, [cssCode, htmlCode, jsCode, code.normalize_css])

  // Update preview when code changes
  useEffect(() => {
    updatePreview()
  }, [cssCode, htmlCode, jsCode, updatePreview])

  const handleSubmit = async () => {
    if (!solution) return
    
    setIsSubmitting(true)
    try {
      const response = await fetch(links.post_submission, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: {
            'style.css': cssCode,
            'index.html': htmlCode,
            'script.js': jsCode
          }
        })
      })

      if (response.ok) {
        console.log('Submission successful')
      }
    } catch (error) {
      console.error('Submission failed:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleComplete = async () => {
    if (!solution) return
    
    try {
      await fetch(links.complete_solution, {
        method: 'POST'
      })
    } catch (error) {
      console.error('Complete failed:', error)
    }
  }

  if (!exercise || !solution) {
    return (
      <div className="exercise-page">
        <div className="exercise-header">
          <h1>Frontend Exercise</h1>
          <p>Loading exercise data...</p>
        </div>
      </div>
    )
  }

  return (
    <div id="bootcamp-frontend-exercise-page" className="exercise-page">
      <div className="exercise-header">
        <h1>{exercise.title}</h1>
        <div className="exercise-status">
          Status: {solution.status}
          {solution.passed_basic_tests && <span className="passed">✓ Tests Passed</span>}
        </div>
      </div>

      <div className="exercise-body">
        <div className="exercise-content">
          <div className="exercise-instructions">
            <div dangerouslySetInnerHTML={{ __html: exercise.introduction_html }} />
          </div>

          <div className="exercise-editors">
            <div className="editor-section">
              <h3>HTML</h3>
              <textarea
                value={htmlCode}
                onChange={(e) => setHtmlCode(e.target.value)}
                className="code-editor html-editor"
                rows={8}
              />
            </div>

            <div className="editor-section">
              <h3>CSS</h3>
              <textarea
                value={cssCode}
                onChange={(e) => setCssCode(e.target.value)}
                className="code-editor css-editor"
                rows={10}
              />
            </div>

            <div className="editor-section">
              <h3>JavaScript</h3>
              <textarea
                value={jsCode}
                onChange={(e) => setJsCode(e.target.value)}
                className="code-editor js-editor"
                rows={12}
              />
            </div>
          </div>

          <div className="exercise-actions">
            <button 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="btn-primary"
            >
              {isSubmitting ? 'Running Tests...' : 'Run Tests'}
            </button>
            
            {solution.passed_basic_tests && (
              <button 
                onClick={handleComplete}
                className="btn-success"
              >
                Complete Exercise
              </button>
            )}
          </div>
        </div>

        <div className="exercise-preview">
          <h3>Preview</h3>
          <div 
            className="preview-container"
            style={{ aspectRatio: code.aspect_ratio || 1 }}
          >
            <iframe
              ref={previewRef}
              className="preview-frame"
              title="Exercise Preview"
              sandbox="allow-scripts"
            />
          </div>
        </div>
      </div>

      {exercise.css_checks && exercise.css_checks.length > 0 && (
        <div className="exercise-checks">
          <h3>CSS Requirements</h3>
          <ul>
            {exercise.css_checks.map((check, index) => (
              <li key={index}>{check}</li>
            ))}
          </ul>
        </div>
      )}

      {exercise.html_checks && exercise.html_checks.length > 0 && (
        <div className="exercise-checks">
          <h3>HTML Requirements</h3>
          <ul>
            {exercise.html_checks.map((check, index) => (
              <li key={index}>{check}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}