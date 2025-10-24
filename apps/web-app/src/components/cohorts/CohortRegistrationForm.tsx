'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'
import { useAuth } from '@/hooks/useAuth'
import { useFormSubmission } from '@/hooks/useFormSubmission'

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

interface CohortRegistrationFormProps {
  cohort: Cohort
  membership: Membership | null
}

export function CohortRegistrationForm({ cohort, membership }: CohortRegistrationFormProps) {
  const { isAuthenticated } = useAuth()
  const [introduction, setIntroduction] = useState('')
  const [agreedToParticipate, setAgreedToParticipate] = useState(false)

  const { submit, isSubmitting, status } = useFormSubmission({
    endpoint: `/api/cohorts/${cohort.slug}/join`,
    method: 'POST',
    onSuccess: () => {
      // Handle successful registration
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!introduction.trim() || !agreedToParticipate) {
      return
    }

    await submit({
      introduction: introduction.trim(),
      active: agreedToParticipate
    })
  }

  return (
    <div id="gobridge-partner-page">
      <a id="register" />
      <section className="contributing-section pb-80">
        <div className="lg-container flex flex-col items-center">
          <h2 className="text-h4 mb-16 flex items-center">
            <GraphicalIcon icon="concepts" />
            <div className="text-gradient ml-24">Get registered</div>
          </h2>

          {!isAuthenticated ? (
            <>
              <h3 className="text-h1 text-center mb-16">
                Sign up for {cohort.name}
              </h3>
              <p className="text-p-xlarge mb-16 text-center mx-auto max-w-[600px]">
                To join {cohort.name.split('(')[0]}, you&apos;ll need to create an Exercism account or sign in to your existing one.
              </p>

              <div className="buttons flex mb-40 flex-col sm:flex-row">
                <Link 
                  href="/auth/signup" 
                  className="btn-primary btn-l mb-12 sm:mb-0 sm:mr-16"
                >
                  Sign up for free
                </Link>
                <Link 
                  href="/auth/signin" 
                  className="btn-secondary btn-l shadow-buttonS"
                >
                  Sign in
                </Link>
              </div>
            </>
          ) : membership?.enrolled ? (
            <>
              <h3 className="text-h1 text-center mb-16">You&apos;re all set!</h3>
              <p className="text-p-xlarge mb-16 text-center mx-auto max-w-[800px]">
                You&apos;re successfully registered for {cohort.name}. We&apos;ll send you updates and information as the cohort begins.
              </p>
            </>
          ) : membership?.positionOnWaitingList ? (
            <>
              <h3 className="text-h1 text-center mb-16">You&apos;re on the waiting list</h3>
              <p className="text-p-xlarge mb-16 text-center mx-auto max-w-[800px]">
                You&apos;re currently #{membership.positionOnWaitingList} on the waiting list for {cohort.name}. 
                We&apos;ll let you know if a spot opens up!
              </p>
            </>
          ) : (
            <>
              <h3 className="text-h1 text-center mb-16">
                Sign up for {cohort.name}
              </h3>
              <p className="text-p-xlarge mb-32 text-center mx-auto max-w-[800px]">
                Registration is easy and free! Just tell us a bit about yourself and commit to participating.
              </p>

              <form 
                onSubmit={handleSubmit}
                className="mx-auto shadow-lgZ1 py-24 px-32 rounded-12 bg-white max-w-[800px]"
              >
                <div className="field mb-12">
                  <label 
                    htmlFor="introduction" 
                    className="text-p-large block text-textColor6 font-semibold mb-2"
                  >
                    Introduce yourself
                  </label>
                  <textarea
                    id="introduction"
                    value={introduction}
                    onChange={(e) => setIntroduction(e.target.value)}
                    placeholder={`Tell us about yourself and why you want to join ${cohort.name}...`}
                    className="w-full h-[120px] p-3 border border-gray-300 rounded-md resize-none"
                    required
                  />
                </div>

                <label className="c-checkbox-wrapper mb-12 flex items-start">
                  <input
                    type="checkbox"
                    checked={agreedToParticipate}
                    onChange={(e) => setAgreedToParticipate(e.target.checked)}
                    required
                    className="mr-3 mt-1"
                  />
                  <div className="row">
                    <div className="c-checkbox">
                      <GraphicalIcon icon="checkmark" />
                    </div>
                    <span className="text-p-large text-textColor6 font-semibold">
                      I commit to participating actively in {cohort.name} and engaging with the community
                    </span>
                  </div>
                </label>

                <button 
                  type="submit"
                  disabled={isSubmitting || !introduction.trim() || !agreedToParticipate}
                  className="btn-primary btn-l"
                >
                  {isSubmitting ? 'Registering...' : 'Register for cohort'}
                </button>

                {status === 'success' && (
                  <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded text-green-800">
                    Successfully registered! We&apos;ll be in touch with more details soon.
                  </div>
                )}
              </form>
            </>
          )}
        </div>
      </section>
    </div>
  )
}