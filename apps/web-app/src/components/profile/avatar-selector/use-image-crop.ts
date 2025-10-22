import { useState, useCallback } from 'react'

export function useImageCrop() {
  const [isOpen, setIsOpen] = useState(false)
  const [imageFile, setImageFile] = useState<File | undefined>()

  const handleAttach = useCallback((file: File) => {
    setImageFile(file)
    setIsOpen(true)
  }, [])

  const handleClose = useCallback(() => {
    setIsOpen(false)
    setImageFile(undefined)
  }, [])

  return {
    isOpen,
    imageFile,
    handleAttach,
    onClose: handleClose
  }
}