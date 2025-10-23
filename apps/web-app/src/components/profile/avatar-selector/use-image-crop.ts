import { useState, useCallback } from 'react'

export interface CropProps {
  x: number
  y: number
  width: number
  height: number
  unit?: 'px' | '%'
  aspect?: number
}

export interface State {
  isOpen: boolean
  imageFile: File | undefined
  imageToCrop: string | undefined
  cropSettings: CropProps
  croppedImage: Blob | undefined
}

export interface Action {
  type: 'OPEN' | 'CLOSE' | 'SET_FILE' | 'SET_CROP' | 'crop.changed' | 'crop.finished' | 'crop.cancelled' | 'avatar.uploaded' | 'crop.redo'
  payload?: {
    file?: File
    cropSettings?: CropProps
    croppedImage?: Blob
  }
}

export function useImageCrop() {
  const [isOpen, setIsOpen] = useState(false)
  const [imageFile, setImageFile] = useState<File | undefined>()
  const [imageToCrop, setImageToCrop] = useState<string | undefined>()
  const [cropSettings, setCropSettings] = useState<CropProps>({
    x: 10,
    y: 10,
    width: 80,
    height: 80,
    unit: '%',
    aspect: 1
  })
  const [croppedImage, setCroppedImage] = useState<Blob | undefined>()

  const handleAttach = useCallback((file: File) => {
    setImageFile(file)
    const url = URL.createObjectURL(file)
    setImageToCrop(url)
    setIsOpen(true)
  }, [])

  const handleClose = useCallback(() => {
    setIsOpen(false)
    setImageFile(undefined)
    if (imageToCrop) {
      URL.revokeObjectURL(imageToCrop)
    }
    setImageToCrop(undefined)
    setCroppedImage(undefined)
  }, [imageToCrop])

  const handleCropChange = useCallback((newCrop: CropProps) => {
    setCropSettings(newCrop)
  }, [])

  const state: State = {
    isOpen,
    imageFile,
    imageToCrop,
    cropSettings,
    croppedImage
  }

  const dispatch = useCallback((action: Action) => {
    switch (action.type) {
      case 'OPEN':
        setIsOpen(true)
        break
      case 'CLOSE':
        handleClose()
        break
      case 'SET_FILE':
        if (action.payload?.file) {
          handleAttach(action.payload.file)
        }
        break
      case 'SET_CROP':
      case 'crop.changed':
        if (action.payload?.cropSettings) {
          setCropSettings(action.payload.cropSettings)
        }
        break
      case 'crop.finished':
        if (action.payload?.croppedImage) {
          setCroppedImage(action.payload.croppedImage)
        }
        break
      case 'crop.cancelled':
        handleClose()
        break
      case 'avatar.uploaded':
        // Handle avatar upload success
        break
      case 'crop.redo':
        // Reset to cropping state
        setCroppedImage(undefined)
        break
    }
  }, [handleAttach, handleClose])

  return {
    state,
    dispatch,
    isOpen,
    imageFile,
    imageToCrop,
    cropSettings,
    croppedImage,
    handleAttach,
    onClose: handleClose,
    onCropChange: handleCropChange
  }
}