import {
  EditorView,
  Decoration,
  ViewPlugin,
  DecorationSet,
} from '@codemirror/view'
import { EditorState, Extension } from '@codemirror/state'

const readonlyDeco = Decoration.mark({ class: 'readonly' })

const createReadonlyPlugin = (readonlyLength: number) =>
  ViewPlugin.fromClass(
    class {
      public decorations: DecorationSet

      constructor() {
        this.decorations = Decoration.set([
          readonlyDeco.range(0, readonlyLength),
        ])
      }

      update() {
        this.decorations = Decoration.set([
          readonlyDeco.range(0, readonlyLength),
        ])
      }
    },
    { decorations: (v) => v.decorations }
  )

const createReadonlyTransactionFilter = (readonlyLength: number) =>
  EditorState.transactionFilter.of((tr) => {
    if (
      tr.newDoc.sliceString(0, readonlyLength) !==
      tr.startState.doc.sliceString(0, readonlyLength)
    ) {
      return []
    }
    return [tr]
  })

export const ReadonlyFunctionMyExtension = (
  readonlyLength: number
): Extension => [
  createReadonlyPlugin(readonlyLength),
  createReadonlyTransactionFilter(readonlyLength),
  EditorView.theme({
    '.readonly': {
      background: '#cccccc88',
      filter: 'grayscale(60%)',
      borderRadius: '4px',
      'pointer-events': 'none',
    },
  }),
]
