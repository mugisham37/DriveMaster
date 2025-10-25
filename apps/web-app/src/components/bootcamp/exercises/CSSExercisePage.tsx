'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { BootcampExercise, BootcampSolution, BootcampCode, BootcampLinks, BootcampProject } from '@/types/bootcamp'

interface CSSExercisePageProps {
  project: BootcampProject
  exercise: BootcampExercise
  solution: BootcampSolution
  test_results?: unknown
  code: BootcampCode
  links: BootcampLinks
}

export function CSSExercisePage({
  exercise,
  solution,
  test_results,
  code,
  links
}: Omit<CSSExercisePageProps, 'project'>) {
  const [cssCode, setCssCode] = useState(code.stub?.css || '')
  const [htmlCode, setHtmlCode] = useState(code.stub?.html || '')
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
        <body class="--jiki-faux-body">
          ${htmlCode}
        </body>
      </html>
    `

    previewDocument.open()
    previewDocument.write(fullHTML)
    previewDocument.close()
  }, [cssCode, htmlCode, code.normalize_css])

  // Update preview when code changes
  useEffect(() => {
    updatePreview()
  }, [cssCode, htmlCode, updatePreview])

  const handleSubmit = async () => {
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
            'index.html': htmlCode
          }
        })
      })

      if (response.ok) {
        // Handle successful submission
        console.log('Submission successful')
      }
    } catch (error) {
      console.error('Submission failed:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleComplete = async () => {
    try {
      await fetch(links.complete_solution, {
        method: 'POST'
      })
      // Redirect or update UI
    } catch (error) {
      console.error('Complete failed:', error)
    }
  }

  return (
    <div id="bootcamp-css-exercise-page" className="exercise-page">
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
            {!code.should_hide_html_editor && (
              <div className="editor-section">
                <h3>HTML</h3>
                <textarea
                  value={htmlCode}
                  onChange={(e) => setHtmlCode(e.target.value)}
                  className="code-editor html-editor"
                  rows={10}
                />
              </div>
            )}

            {!code.should_hide_css_editor && (
              <div className="editor-section">
                <h3>CSS</h3>
                <textarea
                  value={cssCode}
                  onChange={(e) => setCssCode(e.target.value)}
                  className="code-editor css-editor"
                  rows={15}
                />
              </div>
            )}
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
            />
          </div>
        </div>
      </div>

      {test_results ? (
        <div className="test-results">
          <h3>Test Results</h3>
          <pre>{String(JSON.stringify(test_results, null, 2))}</pre>
        </div>
      ) : null}
    </div>
  )
}