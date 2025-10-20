'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { GraphicalIcon } from './GraphicalIcon'

interface MarkdownEditorProps {
  contextId: string
  initialValue?: string
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
}

export function MarkdownEditor({
  contextId,
  initialValue = '',
  onChange,
  placeholder = 'Write your markdown here...',
  className = ''
}: MarkdownEditorProps): React.JSX.Element {
  const [value, setValue] = useState(initialValue)
  const [isPreview, setIsPreview] = useState(false)
  const [previewHtml, setPreviewHtml] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setValue(newValue)
    onChange?.(newValue)
  }, [onChange])

  const togglePreview = useCallback(async () => {
    if (!isPreview) {
      // Convert markdown to HTML (simplified implementation)
      // In a real app, you'd use a proper markdown parser like marked or remark
      const html = value
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*)\*/gim, '<em>$1</em>')
        .replace(/\n/gim, '<br>')
      
      setPreviewHtml(html)
    }
    setIsPreview(!isPreview)
  }, [isPreview, value])

  const insertMarkdown = useCallback((before: string, after: string = '') => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = value.substring(start, end)
    const newText = before + selectedText + after
    
    const newValue = value.substring(0, start) + newText + value.substring(end)
    setValue(newValue)
    onChange?.(newValue)

    // Restore cursor position
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length)
    }, 0)
  }, [value, onChange])

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  return (
    <div className={`markdown-editor ${className}`} data-context-id={contextId}>
      <div className="markdown-editor-toolbar">
        <button
          type="button"
          onClick={() => insertMarkdown('**', '**')}
          title="Bold"
          className="toolbar-button"
        >
          <GraphicalIcon icon="bold" />
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown('*', '*')}
          title="Italic"
          className="toolbar-button"
        >
          <GraphicalIcon icon="italic" />
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown('`', '`')}
          title="Code"
          className="toolbar-button"
        >
          <GraphicalIcon icon="code" />
        </button>
        <button
          type="button"
          onClick={() => insertMarkdown('\n```\n', '\n```\n')}
          title="Code block"
          className="toolbar-button"
        >
          <GraphicalIcon icon="code-block" />
        </button>
        <div className="toolbar-separator" />
        <button
          type="button"
          onClick={togglePreview}
          title={isPreview ? 'Edit' : 'Preview'}
          className={`toolbar-button ${isPreview ? 'active' : ''}`}
        >
          <GraphicalIcon icon={isPreview ? 'edit' : 'eye'} />
          <span>{isPreview ? 'Edit' : 'Preview'}</span>
        </button>
      </div>

      <div className="markdown-editor-content">
        {isPreview ? (
          <div 
            className="markdown-preview"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        ) : (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            placeholder={placeholder}
            className="markdown-textarea"
            rows={10}
          />
        )}
      </div>
    </div>
  )
}

export default MarkdownEditor
