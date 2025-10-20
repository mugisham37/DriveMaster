'use client'

import React from 'react'
import { GohortContent } from './GohortContent'
import { ExhortContent } from './ExhortContent'
import { CohortRegistrationForm } from './CohortRegistrationForm'

interface Track {
  slug: string
  title: string
  iconUrl: string
  numConcepts: number
  numExercises: number
}

interface Cohort {
  slug: string
  name: string
  beginsAt: Date
  type: 'gohort' | 'exhort'
  track: Track
}

interface Membership {
  enrolled: boolean
  positionOnWaitingList?: number
}

interface CohortPageProps {
  cohort: Cohort
  membership: Membership | null
}

export function CohortPage({ cohort, membership }: CohortPageProps) {
  const isClosed = cohort.beginsAt < new Date()

  return (
    <div>
      {isClosed && (
        <div className="bg-backgroundColorA relative">
          <div className="m-20 py-16 px-20 text-18 font-bold text-red border-orange border-1 rounded-5 bg-lightOrange text-center">
            This cohort is now closed for applications
          </div>
        </div>
      )}

      {cohort.type === 'gohort' ? (
        <GohortContent cohort={cohort} />
      ) : (
        <ExhortContent cohort={cohort} />
      )}

      {!isClosed && (
        <CohortRegistrationForm 
          cohort={cohort} 
          membership={membership} 
        />
      )}
    </div>
  )
}