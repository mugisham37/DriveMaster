import React from 'react'

type HealthStatus = 'exemplar' | 'healthy' | 'needs_attention' | 'missing'

interface BuildHealthProps {
  healthStatus: HealthStatus
  plural?: boolean
  className?: string
}

export function BuildHealth({ healthStatus, plural = false, className = '' }: BuildHealthProps): React.JSX.Element {
  const verb = plural ? 'are' : 'is'
  
  const getText = () => {
    switch (healthStatus) {
      case 'exemplar':
        return `${verb} exemplar ✨`
      case 'healthy':
        return `${verb} healthy ✅`
      case 'needs_attention':
        return 'needs attention ⚠️'
      default:
        return `${verb} missing ❓`
    }
  }

  const getTextColorClass = () => {
    switch (healthStatus) {
      case 'exemplar':
      case 'healthy':
        return 'text-healthyGreen'
      case 'needs_attention':
        return 'text-warning'
      default:
        return 'text-textColor6'
    }
  }

  return (
    <span className={`${getTextColorClass()} ${className}`}>
      {getText()}
    </span>
  )
}

export default BuildHealth