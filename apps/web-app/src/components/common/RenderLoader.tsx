import React from 'react'

export const RenderLoader: React.FC = () => {
  return (
    <div className="loading-indicator">
      <div className="spinner" />
      <span>Loading...</span>
    </div>
  )
}

export default RenderLoader