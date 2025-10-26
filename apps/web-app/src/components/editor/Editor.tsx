'use client'

import React, { createContext } from 'react'
import { TabContext } from '../common/Tab'

// Tab index type for editor tabs
export type TabIndex = 'instructions' | 'tests' | 'results' | 'feedback' | 'get-help' | 'chat-gpt'

// Context for managing tabs in the editor
export const TabsContext = createContext<TabContext>({
  current: 'instructions',
  switchToTab: () => null,
})

// Context for managing tasks in the editor
export interface TasksContextType {
  current: number
  switchToTask: (taskId: number) => void
  showJumpToInstructionButton: boolean
}

export const TasksContext = createContext<TasksContextType>({
  current: 0,
  switchToTask: () => null,
  showJumpToInstructionButton: false,
})

// Context for editor features
export interface FeaturesContextType {
  theme: boolean
  keybindings: boolean
}

export const FeaturesContext = createContext<FeaturesContextType>({
  theme: true,
  keybindings: true,
})

// Main Editor component (placeholder - this would be implemented based on your needs)
export interface EditorProps {
  children: React.ReactNode
}

export const Editor: React.FC<EditorProps> = ({ children }) => {
  return (
    <div className="editor">
      {children}
    </div>
  )
}

export default Editor