import React from 'react'
import { assembleClassNames } from '@/utils/assemble-classnames'
import { Icon } from '@/components/common'

export function LayoutSelect({
  layout,
  setLayout,
  className = '',
}: {
  layout: `${'grid' | 'lines'}-layout`
  setLayout: (layout: `${'grid' | 'lines'}-layout`) => void
  className?: string
}) {
  return (
    <div
      className={assembleClassNames(
        'md:flex hidden shrink-0 border-1 border-buttonBorderColor2 rounded-8 overflow-hidden',
        className
      )}
    >
      <LayoutButton
        setLayout={setLayout}
        currentLayout={layout}
        layout={'grid-layout'}
      />
      <LayoutButton
        setLayout={setLayout}
        currentLayout={layout}
        layout={'lines-layout'}
      />
    </div>
  )
}

function LayoutButton({ 
  currentLayout, 
  layout, 
  setLayout 
}: { 
  currentLayout: `${'grid' | 'lines'}-layout`
  layout: `${'grid' | 'lines'}-layout`
  setLayout: (layout: `${'grid' | 'lines'}-layout`) => void 
}) {
  const selected = currentLayout === layout
  return (
    <button
      onClick={() => setLayout(layout)}
      className={assembleClassNames(
        'p-12',
        selected ? 'bg-purple' : 'bg-backgroundColorA'
      )}
    >
      <Icon
        icon={layout}
        alt={`${layout}-button`}
        className={assembleClassNames(
          selected ? 'filter-white' : 'filter-textColor1'
        )}
      />
    </button>
  )
}
