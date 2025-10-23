import { State } from '@/lib/xstate-mock'
import { Track } from '@/components/types'
import { SeniorityLevel } from '../welcome-modal/WelcomeModal'

export type TrackWelcomeModalProps = {
  track: Track
  links: TrackWelcomeModalLinks
  userSeniority: SeniorityLevel
  userJoinedDaysAgo: number
}

export type TrackWelcomeModalLinks = Record<
  | 'hideModal'
  | 'activatePracticeMode'
  | 'activateLearningMode'
  | 'editHelloWorld'
  | 'cliWalkthrough'
  | 'trackTooling'
  | 'learningResources'
  | 'codingFundamentalsCourse'
  | 'downloadCmd',
  string
>

export type CurrentState = State<
  {
    choices: {
      Mode: string
      Interface: string
    }
  },
  string
>
