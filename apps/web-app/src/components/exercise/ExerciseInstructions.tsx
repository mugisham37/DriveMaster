import { Exercise } from '@/types'

interface ExerciseInstructionsProps {
  instructions: string
  exercise: Exercise
}

export function ExerciseInstructions({ instructions, exercise: _exercise }: ExerciseInstructionsProps) {
  return (
    <section className="exercise-instructions">
      <h2>Instructions</h2>
      <div 
        className="instructions-content"
        dangerouslySetInnerHTML={{ __html: instructions.replace(/\n/g, '<br>') }}
      />
    </section>
  )
}