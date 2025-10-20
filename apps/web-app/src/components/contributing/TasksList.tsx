'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'

interface Task {
  id: number
  title: string
  description: string
  type: 'bug' | 'feature' | 'docs' | 'exercise' | 'track'
  difficulty: 'easy' | 'medium' | 'hard'
  track?: string
  tags: string[]
  githubUrl: string
  createdAt: string
}

// Mock data - in real implementation, this would come from API
const mockTasks: Task[] = [
  {
    id: 1,
    title: 'Add missing test cases for JavaScript Arrays exercise',
    description: 'The Arrays exercise is missing some edge case tests. We need to add comprehensive test coverage.',
    type: 'exercise',
    difficulty: 'easy',
    track: 'javascript',
    tags: ['good-first-issue', 'testing'],
    githubUrl: 'https://github.com/exercism/javascript/issues/123',
    createdAt: '2024-01-15T10:00:00Z'
  },
  {
    id: 2,
    title: 'Improve Python track documentation',
    description: 'Update the Python track documentation to include more examples and clearer explanations.',
    type: 'docs',
    difficulty: 'medium',
    track: 'python',
    tags: ['documentation', 'help-wanted'],
    githubUrl: 'https://github.com/exercism/python/issues/456',
    createdAt: '2024-01-14T15:30:00Z'
  },
  {
    id: 3,
    title: 'Fix performance issue in test runner',
    description: 'The test runner is taking too long for large submissions. Need to optimize the execution.',
    type: 'bug',
    difficulty: 'hard',
    tags: ['performance', 'infrastructure'],
    githubUrl: 'https://github.com/exercism/test-runner/issues/789',
    createdAt: '2024-01-13T09:15:00Z'
  }
]

export function TasksList() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [selectedDifficulty, setSelectedDifficulty] = useState('')
  const [selectedTrack, setSelectedTrack] = useState('')

  const filteredTasks = mockTasks
    .filter(task => 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter(task => !selectedType || task.type === selectedType)
    .filter(task => !selectedDifficulty || task.difficulty === selectedDifficulty)
    .filter(task => !selectedTrack || task.track === selectedTrack)

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bug': return 'bug'
      case 'feature': return 'plus'
      case 'docs': return 'docs'
      case 'exercise': return 'exercise'
      case 'track': return 'track'
      default: return 'circle'
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'hard': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="tasks-list">
      <div className="filters mb-8 flex flex-wrap gap-4">
        <input
          type="text"
          placeholder="Search tasks..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md flex-1 min-w-[200px]"
        />
        
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md"
        >
          <option value="">All types</option>
          <option value="bug">Bug fixes</option>
          <option value="feature">New features</option>
          <option value="docs">Documentation</option>
          <option value="exercise">Exercises</option>
          <option value="track">Track maintenance</option>
        </select>

        <select
          value={selectedDifficulty}
          onChange={(e) => setSelectedDifficulty(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md"
        >
          <option value="">All difficulties</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>

        <select
          value={selectedTrack}
          onChange={(e) => setSelectedTrack(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md"
        >
          <option value="">All tracks</option>
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="ruby">Ruby</option>
          <option value="go">Go</option>
        </select>
      </div>

      <div className="space-y-4">
        {filteredTasks.map((task) => (
          <div 
            key={task.id}
            className="bg-white p-6 rounded-lg shadow-md border border-gray-200"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <GraphicalIcon 
                  icon={getTypeIcon(task.type)} 
                  className="w-5 h-5 mr-3 text-gray-500" 
                />
                <h3 className="font-semibold text-lg">{task.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs rounded ${getDifficultyColor(task.difficulty)}`}>
                  {task.difficulty}
                </span>
                {task.track && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                    {task.track}
                  </span>
                )}
              </div>
            </div>

            <p className="text-gray-600 mb-4">{task.description}</p>

            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-2">
                {task.tags.map((tag) => (
                  <span 
                    key={tag}
                    className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-500">
                  {formatDate(task.createdAt)}
                </span>
                <Link
                  href={task.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary btn-s"
                >
                  View on GitHub
                  <GraphicalIcon icon="external-link" className="w-4 h-4 ml-2" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredTasks.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No tasks found matching your criteria.</p>
        </div>
      )}
    </div>
  )
}