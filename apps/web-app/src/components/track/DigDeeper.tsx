import React, { createContext } from 'react'
import { Exercise, Track } from '../types'

interface DigDeeperData {
  exercise: Exercise
  track: Track
  links: {
    self: string
    video?: {
      lookup: string
      create: string
    }
  }
}

export const DigDeeperDataContext = createContext<DigDeeperData>({
  exercise: {
    id: 0,
    slug: '',
    title: '',
    iconUrl: '',
    difficulty: 1,
    status: 'available',
    type: 'practice'
  },
  track: {
    id: 0,
    slug: '',
    title: '',
    iconUrl: '',
    isJoined: false,
    numCompletedExercises: 0,
    numExercises: 0
  },
  links: {
    self: ''
  }
})

interface DigDeeperProps {
  data: DigDeeperData
  children: React.ReactNode
}

export function DigDeeper({ data, children }: DigDeeperProps): React.ReactElement {
  return (
    <DigDeeperDataContext.Provider value={data}>
      {children}
    </DigDeeperDataContext.Provider>
  )
}