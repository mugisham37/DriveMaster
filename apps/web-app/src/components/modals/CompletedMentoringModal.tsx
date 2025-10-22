'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/common'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'
import { Avatar } from '@/components/common/Avatar'
import { useModalManager } from '@/hooks/useModalManager'
import Link from 'next/link'

interface MentoringSession {
  id: string
  student: {
    handle: string
    avatarUrl: string
  }
  mentor: {
    handle: string
    avatarUrl: string
  }
  track: {
    title: string
    slug: string
    iconUrl: string
  }
  exercise: {
    title: string
    slug: string
  }
  completedAt: string
  reputationEarned?: number
}

interface CompletedMentoringModalProps {
  session?: MentoringSession
}

export function CompletedMentoringModal({ session }: CompletedMentoringModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { registerModal, canShowModal } = useModalManager()

  useEffect(() => {
    // Register this modal with the modal manager
    registerModal({
      id: 'completed-mentoring-modal',
      priority: 4,
      component: CompletedMentoringModal
    })
  }, [registerModal])

  useEffect(() => {
    if (session && canShowModal('completed-mentoring-modal')) {
      setIsOpen(true)
    }
  }, [session, canShowModal])

  const handleClose = () => {
    setIsOpen(false)
  }

  if (!session) return null

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      className="completed-mentoring-modal"
      ReactModalClassName="max-w-[500px]"
    >
      <div className="text-center p-8">
        <div className="mb-6">
          <GraphicalIcon 
            icon="mentoring" 
            className="w-16 h-16 mx-auto mb-4 text-green-500" 
          />
        </div>

        <h2 className="text-h2 mb-4">Mentoring Session Completed!</h2>
        
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="text-center">
              <Avatar 
                user={{
                  avatarUrl: session.student.avatarUrl,
                  handle: session.student.handle
                }}
                size="medium"
              />
              <div className="text-sm font-medium">{session.student.handle}</div>
              <div className="text-xs text-gray-500">Student</div>
            </div>
            
            <GraphicalIcon icon="arrow-right" className="text-gray-400" />
            
            <div className="text-center">
              <Avatar 
                user={{
                  avatarUrl: session.mentor.avatarUrl,
                  handle: session.mentor.handle
                }}
                size="medium"
              />
              <div className="text-sm font-medium">{session.mentor.handle}</div>
              <div className="text-xs text-gray-500">Mentor</div>
            </div>
          </div>

          <div className="text-center">
            <div className="font-semibold">{session.exercise.title}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              in {session.track.title}
            </div>
          </div>
        </div>

        {session.reputationEarned && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
            <div className="text-sm text-blue-700 dark:text-blue-300">
              You earned <strong>{session.reputationEarned} reputation</strong> for this mentoring session!
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <Link
            href={`/mentoring/discussions/${session.id}`}
            className="btn-s btn-default"
          >
            View Discussion
          </Link>
          
          <button
            onClick={handleClose}
            className="btn-s btn-primary"
          >
            Continue
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default CompletedMentoringModal