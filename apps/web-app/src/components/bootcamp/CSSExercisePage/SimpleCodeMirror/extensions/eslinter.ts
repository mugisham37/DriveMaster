import { Diagnostic, linter as cmLinter } from '@codemirror/lint'

// Mock ESLint implementation since the package is not available
const mockLinter = {
  verify: (_code: string, _config: Record<string, unknown>) => {
    // Simple mock implementation - in production, you'd want to install eslint-linter-browserify
    return [] as Array<{
      line: number
      column: number
      endLine?: number
      endColumn?: number
      severity: number
      message: string
      ruleId?: string
    }>
  }
}

export const eslintLinter = cmLinter((view) => {
  const code = view.state.doc.toString()

  const messages = mockLinter.verify(code, {
    rules: {
      'no-console': 2,
    },
  })

  const diagnostics: Diagnostic[] = messages.map((msg: {
    line: number
    column: number
    endLine?: number
    endColumn?: number
    severity: number
    message: string
    ruleId?: string
  }) => ({
    from: view.state.doc.line(msg.line).from + (msg.column - 1),
    to:
      view.state.doc.line(msg.endLine ?? msg.line).from +
      (msg.endColumn ?? msg.column - 1),
    severity: msg.severity === 2 ? 'error' : 'warning',
    message: msg.message,
    source: msg.ruleId ?? 'eslint',
  }))

  return diagnostics
})