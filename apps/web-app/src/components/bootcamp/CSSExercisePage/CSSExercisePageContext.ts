import { EditorView } from 'codemirror'
import { createContext } from 'react'
import { Handler } from '../JikiscriptExercisePage/CodeMirror/CodeMirror'

type CSSExercisePageContextType = {
  actualIFrameRef: React.RefObject<HTMLIFrameElement | null>
  expectedIFrameRef: React.RefObject<HTMLIFrameElement | null>
  expectedReferenceIFrameRef: React.RefObject<HTMLIFrameElement | null>
  htmlEditorRef: React.RefObject<EditorView | null>
  cssEditorRef: React.RefObject<EditorView | null>
  exercise: CSSExercisePageExercise
  code: CSSExercisePageCode
  handleCompare: () => Promise<number>
  resetEditors: () => void
  handleHtmlEditorDidMount: (handler: Handler) => void
  handleCssEditorDidMount: (handler: Handler) => void
  setEditorCodeLocalStorage: React.Dispatch<
    React.SetStateAction<{
      htmlEditorContent: string
      cssEditorContent: string
      readonlyRanges: {
        css: ReadonlyRange[]
        html: ReadonlyRange[]
      }
      storedAt: string
    }>
  >
  links: CSSExercisePageProps['links']
  solution: CSSExercisePageProps['solution']
}

export const CSSExercisePageContext = createContext<CSSExercisePageContextType>(
  {} as CSSExercisePageContextType
)
