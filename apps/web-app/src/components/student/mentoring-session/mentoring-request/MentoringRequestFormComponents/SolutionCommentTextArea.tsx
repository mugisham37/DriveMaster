import React, { forwardRef } from 'react'

interface SolutionCommentTextAreaProps {
  defaultValue?: string
  className?: string
}

export const SolutionCommentTextArea = forwardRef<
  HTMLTextAreaElement,
  SolutionCommentTextAreaProps
>(({ defaultValue = '', className = '' }, ref) => {
  return (
    <div className={`solution-comment-textarea ${className}`}>
      <label htmlFor="solution-comment" className="block text-sm font-medium mb-2">
        What would you like help with?
      </label>
      <textarea
        ref={ref}
        id="solution-comment"
        name="solution_comment"
        defaultValue={defaultValue}
        className="w-full p-3 border border-gray-300 rounded-md resize-vertical min-h-[100px]"
        placeholder="Describe what you'd like feedback on..."
      />
    </div>
  )
})

SolutionCommentTextArea.displayName = 'SolutionCommentTextArea'