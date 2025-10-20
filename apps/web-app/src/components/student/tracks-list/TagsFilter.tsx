import React from 'react'

interface TagsFilterProps {
  tags: string[]
  selectedTags: string[]
  onTagsChange: (tags: string[]) => void
}

export function TagsFilter({ tags, selectedTags, onTagsChange }: TagsFilterProps) {
  const handleTagToggle = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag]
    onTagsChange(newTags)
  }

  return (
    <div className="tags-filter">
      {tags.map(tag => (
        <button
          key={tag}
          onClick={() => handleTagToggle(tag)}
          className={`tag ${selectedTags.includes(tag) ? 'selected' : ''}`}
        >
          {tag}
        </button>
      ))}
    </div>
  )
}