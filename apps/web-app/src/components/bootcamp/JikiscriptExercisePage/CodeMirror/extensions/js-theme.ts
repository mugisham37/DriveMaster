import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

export const EDITOR_COLORS = {
  background: '#FFFFFF',
  foreground: '#4D4D4C',
  caret: '#AEAFAD',
  gutterBackground: '#FFFFFF',
  gutterForeground: '#4D4D4C80',
  lineHighlight: '#D6ECFA80',
  selection: '#D5D1F2',
  selectionMatch: '#D5D1F2',
}

const highlightStyle = HighlightStyle.define([
  {
    tag: [t.comment, t.lineComment, t.blockComment],
    color: '#818B94',
    fontStyle: 'italic',
  },
  {
    tag: [t.string, t.special(t.string)],
    color: '#3E8A00',
  },
  {
    tag: [t.keyword, t.controlKeyword, t.definitionKeyword, t.moduleKeyword],
    color: '#0080FF',
    fontWeight: '500',
  },
  {
    tag: t.variableName,
    color: '#7A009F',
  },
  {
    tag: t.definition(t.variableName),
    color: '#7A009F',
  },
  {
    tag: t.constant(t.variableName),
    color: '#AA00FF',
  },
  {
    tag: [t.function(t.variableName), t.function(t.propertyName)],
    color: 'rgb(184, 0, 255)',
    borderBottom: '0.5px solid rgba(184, 0, 255, 0.6)',
  },
  {
    tag: [t.propertyName],
    color: '#0D47A1',
  },
  {
    tag: t.definition(t.propertyName),
    color: '#0D47A1',
  },
  {
    tag: t.className,
    color: '#00008B',
  },
  {
    tag: t.typeName,
    color: '#005CC5',
  },
  {
    tag: [t.bool, t.null, t.number, t.float],
    color: '#F33636',
  },
  {
    tag: [
      t.logicOperator,
      t.arithmeticOperator,
      t.compareOperator,
      t.updateOperator,
      t.operator,
    ],
    color: '#0080FF',
  },
  {
    tag: t.regexp,
    color: '#E91E63',
  },
  {
    tag: [t.paren, t.squareBracket, t.brace, t.angleBracket, t.separator],
    color: '#888',
  },
  {
    tag: [t.tagName],
    color: '#0288D1',
  },
  {
    tag: [t.attributeName],
    color: '#0D47A1',
  },
  {
    tag: [t.attributeValue],
    color: '#3E8A00',
  },
  {
    tag: t.namespace,
    color: '#795548',
  },
  {
    tag: [t.meta, t.self],
    color: '#607D8B',
    fontStyle: 'italic',
  },
  {
    tag: t.invalid,
    color: '#f00',
    textDecoration: 'underline',
  },
])

export const jsTheme = [
  EditorView.theme({
    '&': {
      color: EDITOR_COLORS.foreground,
      backgroundColor: EDITOR_COLORS.background,
    },
    '.cm-content': {
      caretColor: EDITOR_COLORS.caret,
    },
    '.cm-focused .cm-cursor': {
      borderLeftColor: EDITOR_COLORS.caret,
    },
    '.cm-focused .cm-selectionBackground, ::selection': {
      backgroundColor: EDITOR_COLORS.selection,
    },
    '.cm-gutters': {
      backgroundColor: EDITOR_COLORS.gutterBackground,
      color: EDITOR_COLORS.gutterForeground,
    },
    '.cm-activeLine': {
      backgroundColor: EDITOR_COLORS.lineHighlight,
    },
  }),
  syntaxHighlighting(highlightStyle),
]
