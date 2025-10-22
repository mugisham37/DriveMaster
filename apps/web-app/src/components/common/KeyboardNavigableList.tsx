import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useKeyboardNavigation, useRovingTabIndex } from '@/hooks/useKeyboardNavigation'
import { useLiveRegion } from '@/hooks/useAccessibility'

export interface KeyboardNavigableListProps<T> {
  items: T[]
  renderItem: (item: T, index: number, isActive: boolean) => React.ReactNode
  onSelect?: (item: T, index: number) => void
  orientation?: 'vertical' | 'horizontal'
  wrap?: boolean
  className?: string
  itemClassName?: string
  activeItemClassName?: string
  role?: 'list' | 'listbox' | 'menu' | 'grid'
  ariaLabel?: string
  ariaLabelledBy?: string
  getItemId?: (item: T, index: number) => string
  getItemLabel?: (item: T, index: number) => string
  announceSelection?: boolean
}

export function KeyboardNavigableList<T>({
  items,
  renderItem,
  onSelect,
  orientation = 'vertical',
  wrap = true,
  className = '',
  itemClassName = '',
  activeItemClassName = 'bg-blue-100',
  role = 'list',
  ariaLabel,
  ariaLabelledBy,
  getItemId,
  getItemLabel,
  announceSelection = true
}: KeyboardNavigableListProps<T>): React.JSX.Element {
  const [activeIndex, setActiveIndex] = useState(0)
  const itemRefs = useRef<(HTMLElement | null)[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const { announce } = useLiveRegion()

  // Update item refs when items change
  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, items.length)
  }, [items.length])

  // Use roving tabindex for proper keyboard navigation
  const { setActiveIndex: setRovingIndex } = useRovingTabIndex(
    itemRefs.current.filter(Boolean) as HTMLElement[],
    activeIndex
  )

  const moveToIndex = useCallback((newIndex: number) => {
    if (newIndex >= 0 && newIndex < items.length) {
      setActiveIndex(newIndex)
      setRovingIndex(newIndex)
      
      // Announce selection if enabled
      if (announceSelection && getItemLabel && items[newIndex]) {
        const label = getItemLabel(items[newIndex]!, newIndex)
        announce(`${label}, ${newIndex + 1} of ${items.length}`)
      }
    }
  }, [items, setRovingIndex, announceSelection, getItemLabel, announce])

  const moveNext = useCallback(() => {
    const nextIndex = activeIndex + 1
    if (nextIndex < items.length) {
      moveToIndex(nextIndex)
    } else if (wrap) {
      moveToIndex(0)
    }
  }, [activeIndex, items.length, wrap, moveToIndex])

  const movePrevious = useCallback(() => {
    const prevIndex = activeIndex - 1
    if (prevIndex >= 0) {
      moveToIndex(prevIndex)
    } else if (wrap) {
      moveToIndex(items.length - 1)
    }
  }, [activeIndex, items.length, wrap, moveToIndex])

  const moveFirst = useCallback(() => {
    moveToIndex(0)
  }, [moveToIndex])

  const moveLast = useCallback(() => {
    moveToIndex(items.length - 1)
  }, [items.length, moveToIndex])

  const selectCurrent = useCallback(() => {
    if (onSelect && activeIndex >= 0 && activeIndex < items.length && items[activeIndex]) {
      onSelect(items[activeIndex]!, activeIndex)
    }
  }, [onSelect, items, activeIndex])

  // Set up keyboard navigation
  const keyboardOptions: Parameters<typeof useKeyboardNavigation>[0] = {
    onHome: moveFirst,
    onEnd: moveLast,
    onEnter: selectCurrent,
    onEscape: () => {
      // Blur the current item
      if (itemRefs.current[activeIndex]) {
        itemRefs.current[activeIndex]?.blur()
      }
    }
  }

  if (orientation === 'vertical') {
    keyboardOptions.onArrowDown = moveNext
    keyboardOptions.onArrowUp = movePrevious
  } else {
    keyboardOptions.onArrowRight = moveNext
    keyboardOptions.onArrowLeft = movePrevious
  }

  useKeyboardNavigation(keyboardOptions)

  const handleItemClick = useCallback((item: T, index: number) => {
    moveToIndex(index)
    if (onSelect) {
      onSelect(item, index)
    }
  }, [moveToIndex, onSelect])

  const handleItemFocus = useCallback((index: number) => {
    setActiveIndex(index)
  }, [])

  return (
    <div
      ref={containerRef}
      role={role}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-orientation={orientation}
      className={className}
    >
      {items.map((item, index) => {
        const isActive = index === activeIndex
        const itemId = getItemId ? getItemId(item, index) : `item-${index}`
        
        return (
          <div
            key={itemId}
            ref={(el) => {
              itemRefs.current[index] = el
            }}
            id={itemId}
            role={role === 'list' ? 'listitem' : role === 'listbox' ? 'option' : 'menuitem'}
            tabIndex={isActive ? 0 : -1}
            aria-selected={role === 'listbox' ? isActive : undefined}
            className={`${itemClassName} ${isActive ? activeItemClassName : ''}`}
            onClick={() => handleItemClick(item, index)}
            onFocus={() => handleItemFocus(index)}
          >
            {renderItem(item, index, isActive)}
          </div>
        )
      })}
    </div>
  )
}
