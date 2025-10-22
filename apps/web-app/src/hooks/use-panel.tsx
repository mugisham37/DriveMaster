import { useEffect, useState, useCallback } from 'react'

export function usePanel() {
  const [open, setOpen] = useState(false)
  const [buttonElement, setButtonElement] = useState<HTMLElement | null>(null)
  const [panelElement, setPanelElement] = useState<HTMLDivElement | null>(null)

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (
        buttonElement?.contains(e.target as Node) ||
        panelElement?.contains(e.target as Node)
      ) {
        return
      }

      if (!open) {
        return
      }

      setOpen(false)
    },
    [buttonElement, open, panelElement]
  )

  useEffect(() => {
    document.addEventListener('mousedown', handleMouseDown)

    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
    }
  }, [handleMouseDown])

  return {
    open,
    setOpen,
    buttonElement,
    buttonAttributes: {
      ref: setButtonElement,
    },
    panelAttributes: {
      ref: setPanelElement,
      style: { zIndex: 100 },
    },
  }
}
