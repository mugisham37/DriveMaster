'use client'

import { useState } from 'react'

interface ExerciseFile {
  filename: string
  content: string
  type: 'exercise' | 'solution' | 'readonly'
}

interface ExerciseFilesProps {
  files: ExerciseFile[]
}

export function ExerciseFiles({ files }: ExerciseFilesProps) {
  const [activeFile, setActiveFile] = useState(0)

  return (
    <section className="exercise-files">
      <h2>Files</h2>
      
      <div className="file-tabs">
        {files.map((file, index) => (
          <button
            key={file.filename}
            className={`file-tab ${index === activeFile ? 'active' : ''}`}
            onClick={() => setActiveFile(index)}
          >
            {file.filename}
            <span className={`file-type ${file.type}`}>
              {file.type}
            </span>
          </button>
        ))}
      </div>

      <div className="file-content">
        <pre>
          <code>
            {files[activeFile]?.content}
          </code>
        </pre>
      </div>
    </section>
  )
}