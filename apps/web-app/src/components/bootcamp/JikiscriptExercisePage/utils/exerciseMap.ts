import DrawExercise from '../exercises/draw/DrawExercise'
import MazeExercise from '../exercises/maze/MazeExercise'
import SpaceInvadersExercise from '../exercises/space_invaders/SpaceInvadersExercise'
import WordleExercise from '../exercises/wordle/WordleExercise'
import GolfExercise from '../exercises/golf/GolfExercise'
import DigitalClockExercise from '../exercises/time/DigitalClockExercise'
import RockPaperScissorsExercise from '../exercises/rock_paper_scissors/RockPaperScissorsExercise'
import TicTacToeExercise from '../exercises/tic_tac_toe/TicTacToeExercise'
import BreakoutExercise from '../exercises/breakout/BreakoutExercise'
import WeatherExercise from '../exercises/weather/WeatherExercise'
import HouseExercise from '../exercises/house/HouseExercise'
import DataExercise from '../exercises/data/DataExercise'
import FormalRobotsExercise from '../exercises/formal_robots/FormalRobotsExercise'

import { Exercise } from '../exercises/Exercise'

import type { Config } from '../../types/JikiscriptTypes'

export interface ExerciseConstructor {
  new (...args: unknown[]): Exercise
  hasView: boolean
}
export type Project = ExerciseConstructor
const projectsCache = new Map<string, Project>()

projectsCache.set('draw', DrawExercise as unknown as Project)
projectsCache.set('maze', MazeExercise as unknown as Project)
projectsCache.set('wordle', WordleExercise as unknown as Project)
projectsCache.set('golf', GolfExercise as unknown as Project)
projectsCache.set('space-invaders', SpaceInvadersExercise as unknown as Project)
projectsCache.set('digital-clock', DigitalClockExercise as unknown as Project)
projectsCache.set('rock-paper-scissors', RockPaperScissorsExercise as unknown as Project)
projectsCache.set('tic-tac-toe', TicTacToeExercise as unknown as Project)
projectsCache.set('breakout', BreakoutExercise as unknown as Project)
projectsCache.set('weather', WeatherExercise as unknown as Project)
projectsCache.set('house', HouseExercise as unknown as Project)
projectsCache.set('data', DataExercise as unknown as Project)
projectsCache.set('formal-robots', FormalRobotsExercise as unknown as Project)

export default projectsCache

export function getAndInitializeExerciseClass(config: Config): Exercise | null {
  if (!config.projectType) return null

  const Project = projectsCache.get(config.projectType)
  if (!Project) {
    return null
  }
  const exercise: Exercise = new Project()
  return exercise
}
