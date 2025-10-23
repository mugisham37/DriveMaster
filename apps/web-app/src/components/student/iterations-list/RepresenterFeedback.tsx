import React from 'react'

interface EditedByProps {
  editor?: {
    name: string
    avatarUrl?: string
  } | undefined
  author: {
    name: string
    avatarUrl?: string
  }
}

export function EditedBy({ editor, author }: EditedByProps): React.JSX.Element | null {
  if (!editor || editor.name === author.name) {
    return null
  }

  return (
    <span className="edited-by">
      {' '}(edited by {editor.name})
    </span>
  )
}