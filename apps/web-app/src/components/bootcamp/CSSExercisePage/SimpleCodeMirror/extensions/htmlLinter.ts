import { linter as cmLinter, Diagnostic } from '@codemirror/lint'
import { EditorView } from 'codemirror'

// Mock HTMLHint implementation since the package is not available
const mockHTMLHint = {
  verify: (_code: string, _rules: Record<string, boolean>) => {
    // Simple mock implementation - in production, you'd want to install htmlhint
    return [] as Array<{
      line: number
      col: number
      type: 'error' | 'warning'
      message: string
      rule: { id: string }
    }>
  }
}

export const htmlLinter = cmLinter((view) => {
  const code = view.state.doc.toString()
  const messages = mockHTMLHint.verify(code, {
    'tag-pair': true,
    'attr-no-duplication': true,
    'attr-unsafe-chars': true,
    'tagname-lowercase': true,
    'attr-lowercase': true,
    'id-unique': true,
    'spec-char-escape': true,
  })

  const diagnostics: Diagnostic[] = messages.map((msg: {
    line: number
    col: number
    type: 'error' | 'warning'
    message: string
    rule: { id: string }
  }) => ({
    from: view.state.doc.line(msg.line).from + msg.col - 1,
    to: view.state.doc.line(msg.line).from + msg.col,
    severity: msg.type === 'error' ? 'error' : 'warning',
    message: msg.message,
    source: msg.rule.id,
  }))

  return diagnostics
})

export const lintTooltipTheme = EditorView.theme({
  '.cm-tooltip-hover.cm-tooltip.cm-tooltip-below': {
    borderRadius: '8px',
  },

  '.cm-tooltip .cm-tooltip-lint': {
    backgroundColor: 'var(--backgroundColorF)',
    borderRadius: '8px',
    color: 'var(--textColor6)',
    border: '1px solid var(--borderColor6)',
    padding: '4px 8px',
    fontSize: '14px',
    fontFamily: 'poppins',
  },
  'span.cm-diagnosticText': {
    display: 'block',
    marginBottom: '8px',
  },
  '.cm-diagnostic.cm-diagnostic-error': {
    borderColor: '#EB5757',
  },
  '.cm-diagnostic.cm-diagnostic-warning': {
    borderColor: '#F69605',
  },
})