import React, { useCallback, useState } from 'react'

const INVALID_INPUT_STYLES = '!border-1 !border-orange mb-8'

export function useInvalidField() {
  const [invalidMessage, setInvalidMessage] = useState<string>('')

  const isInvalid = invalidMessage.length > 0

  const applyInvalidClassName = useCallback(() => {
    return isInvalid ? INVALID_INPUT_STYLES : null
  }, [isInvalid])

  const handleInvalid = useCallback((e: React.InvalidEvent<HTMLInputElement>) => {
    e.preventDefault()
    setInvalidMessage(e.target.title)
  }, [])

  const clearInvalidMessage = useCallback(() => {
    setInvalidMessage('')
  }, [])

  function ValidationErrorMessage() {
    return isInvalid ? (
      <span className="text-orange font-semibold">{invalidMessage}</span>
    ) : null
  }

  return {
    invalidMessage,
    isInvalid,
    applyInvalidClassName,
    handleInvalid,
    clearInvalidMessage,
    ValidationErrorMessage,
  }
}

export function createMaxLengthAttributes(
  fieldName: string,
  maxLength: number,
  t: (key: string, options?: Record<string, unknown>) => string
) {
  const pattern = `.{0,${maxLength}}`
  const title = t('field.mustBeNoLongerThan', { fieldName, maxLength })
  return { pattern, title }
}
