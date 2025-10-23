// i18n-key-prefix: croppingStep
// i18n-namespace: components/profile/avatar-selector/cropping-modal
import React, { useCallback, useRef } from 'react'
import { State, Action, CropProps } from '../use-image-crop'
import { cropImage } from './cropImage'
import { useAppTranslation } from '@/i18n/useAppTranslation'

// Mock ReactCrop component since react-image-crop is not installed
interface ReactCropProps {
  src: string
  crop: CropProps
  circularCrop?: boolean
  onChange: (crop: CropProps) => void
  onImageLoaded?: (image: HTMLImageElement) => void
  className?: string
  imageStyle?: React.CSSProperties
  keepSelection?: boolean
}

const ReactCrop: React.FC<ReactCropProps> = ({ 
  src, 
  crop, 
  onChange, 
  onImageLoaded, 
  className = "",
  imageStyle = {}
}) => {
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (onImageLoaded) {
      onImageLoaded(e.currentTarget)
    }
  }

  return (
    <div className={`react-crop-mock ${className}`}>
      <img 
        src={src} 
        onLoad={handleImageLoad}
        style={imageStyle}
        alt="Crop preview"
      />
      <div className="crop-controls">
        <p>Crop: {crop.width}% x {crop.height}%</p>
        <button 
          type="button"
          onClick={() => onChange({ ...crop, width: Math.min(crop.width + 10, 100) })}
        >
          Increase Width
        </button>
        <button 
          type="button"
          onClick={() => onChange({ ...crop, height: Math.min(crop.height + 10, 100) })}
        >
          Increase Height
        </button>
      </div>
    </div>
  )
}

export const CroppingStep = ({
  state,
  dispatch,
}: {
  state: State
  dispatch: React.Dispatch<Action>
}): React.JSX.Element => {
  const { t } = useAppTranslation(
    'components/profile/avatar-selector/cropping-modal'
  )

  if (!state.imageToCrop) {
    throw new Error('Cropped image was expected to exist')
  }

  const imageToCropRef = useRef<HTMLImageElement | null>(null)

  const handleCropChange = useCallback(
    (cropSettings: CropProps) => {
      dispatch({
        type: 'crop.changed',
        payload: { cropSettings: cropSettings },
      })
    },
    [dispatch]
  )

  const handleImageLoaded = useCallback((image: HTMLImageElement) => {
    imageToCropRef.current = image
  }, [])

  const handleCropFinish = useCallback(() => {
    if (!imageToCropRef.current) {
      return
    }

    /* The lib breaks if x or y are 0 */
    if (state.cropSettings.y == 0) {
      state.cropSettings.y = 1
    }
    if (state.cropSettings.x == 0) {
      state.cropSettings.x = 1
    }
    cropImage(imageToCropRef.current, state.cropSettings).then((blob) => {
      if (!blob) {
        throw new Error('Unable to crop image')
      }

      dispatch({ type: 'crop.finished', payload: { croppedImage: blob } })
    })
  }, [dispatch, state.cropSettings])

  const handleCropCancel = useCallback(() => {
    dispatch({ type: 'crop.cancelled' })
  }, [dispatch])

  return (
    <>
      <h3>{t('croppingStep.cropYourPhoto')}</h3>
      <ReactCrop
        src={state.imageToCrop}
        crop={state.cropSettings}
        circularCrop={true}
        onChange={handleCropChange}
        onImageLoaded={handleImageLoaded}
        className="cropper"
        imageStyle={{ height: '50vh' }}
        keepSelection={true}
      />
      <div className="btns">
        <button
          type="button"
          onClick={handleCropCancel}
          className="btn-default btn-s"
        >
          {t('croppingStep.cancel')}
        </button>
        <button
          type="button"
          onClick={handleCropFinish}
          className="btn-primary btn-s"
        >
          {t('croppingStep.crop')}
        </button>
      </div>
    </>
  )
}
