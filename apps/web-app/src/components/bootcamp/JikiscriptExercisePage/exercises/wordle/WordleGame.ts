import { ExecutionContext } from '@/lib/interpreter/executor'
import * as Jiki from '@/lib/interpreter/jikiObjects'
import WordleExercise from './WordleExercise'

function fn(this: WordleExercise) {
  // eslint-disable-next-line @typescript-eslint/no-this-alias
  const exercise = this;
  const WordleGame = new Jiki.JikiClass('WordleGame');

  (WordleGame as Jiki.JikiClass & { addGetter: (name: string, visibility: string, fn: (executionCtx: ExecutionContext, object: Jiki.Instance) => Jiki.JikiString) => void }).addGetter(
    'target_word',
    'public',
    function (_executionCtx: ExecutionContext, _object: Jiki.Instance) {
      return new Jiki.JikiString(exercise.targetWord)
    }
  );
  (WordleGame as Jiki.JikiClass & { addMethod: (name: string, description: string, visibility: string, fn: (executionCtx: ExecutionContext, instance: Jiki.Instance) => void) => void }).addMethod(
    'draw_board',
    'drew the board',
    'public',
    function (executionCtx: ExecutionContext, _instance: Jiki.Instance) {
      exercise.setupView(executionCtx)
    }
  );
  (WordleGame as Jiki.JikiClass & { addMethod: (name: string, description: string, visibility: string, fn: (executionCtx: ExecutionContext, instance: Jiki.Instance, row: Jiki.JikiObject, word: Jiki.JikiObject, states: Jiki.JikiObject) => void) => void }).addMethod(
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
        executionCtx.logicError('The first input must be a number')
        return
      }
      if ((row.value as number) < 1 || (row.value as number) > 6) {
        executionCtx.logicError(
          `The first input must be between 1 and 6 (it was ${row.value}).`
        )
        return
      }
      if (!(word instanceof Jiki.JikiString)) {
        executionCtx.logicError('Word must be a string')
        return
      }
      if (!(states instanceof Jiki.JikiList)) {
        executionCtx.logicError('States must be a list')
        return
      }
      exercise.drawGuess(executionCtx, (row.value as number) - 1, word.value as string)
      exercise.colorRow(executionCtx, row, states)
    }
  )
  return WordleGame
}

export function buildWordleGame(binder: WordleExercise) {
  return fn.bind(binder)()
}
