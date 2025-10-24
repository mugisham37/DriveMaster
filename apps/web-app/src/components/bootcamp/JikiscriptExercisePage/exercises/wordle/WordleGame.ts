import { ExecutionContext } from '@/lib/interpreter/executor'
import * as Jiki from '@/lib/interpreter/jikiObjects'
import WordleExercise from './WordleExercise'

function fn(this: WordleExercise) {
  const exercise = this;
  const WordleGame = new Jiki.JikiClass('WordleGame');

  (WordleGame as unknown as { addGetter: (name: string, visibility: string, fn: Function) => void }).addGetter(
    'target_word',
    'public',
    function (_executionCtx: ExecutionContext, _object: Jiki.Instance) {
      return new Jiki.JikiString(exercise.targetWord)
    }
  );
  (WordleGame as unknown as { addMethod: (name: string, description: string, visibility: string, fn: Function) => void }).addMethod(
    'draw_board',
    'drew the board',
    'public',
    function (executionCtx: ExecutionContext, _instance: Jiki.Instance) {
      exercise.setupView(executionCtx)
    }
  );
  (WordleGame as unknown as { addMethod: (name: string, description: string, visibility: string, fn: Function) => void }).addMethod(
    'add_word',
    'added a word to the board',
    'public',
    function (
      executionCtx: ExecutionContext,
      _instance: Jiki.Instance,
      row: Jiki.JikiObject,
      word: Jiki.JikiObject,
      states: Jiki.JikiObject
    ) {
      if (!(row instanceof Jiki.JikiNumber)) {
        return executionCtx.logicError('The first input must be a number')
      }
      if (row.value < 1 || row.value > 6) {
        return executionCtx.logicError(
          `The first input must be between 1 and 6 (it was ${row.value}).`
        )
      }
      if (!(word instanceof Jiki.JikiString)) {
        return executionCtx.logicError('Word must be a string')
      }
      if (!(states instanceof Jiki.JikiList)) {
        return executionCtx.logicError('States must be a list')
      }
      exercise.drawGuess(executionCtx, row.value - 1, word.value)
      exercise.colorRow(executionCtx, row, states)
    }
  )
  return WordleGame
}

export function buildWordleGame(binder: WordleExercise) {
  return fn.bind(binder)()
}
