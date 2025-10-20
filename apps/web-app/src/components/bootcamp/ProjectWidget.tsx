'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'

interface BootcampProject {
  id: number
  slug: string
  title: string
  description?: string
  icon_url: string
  unlocked?: boolean
  links: {
    self: string
  }
}

interface BootcampUserProject {
  id: number
  status: 'available' | 'started' | 'completed' | 'locked'
}

interface ProjectWidgetProps {
  project: BootcampProject
  user_project?: BootcampUserProject
  className?: string
}

export function ProjectWidget({
  project,
  user_project,
  className = ''
}: ProjectWidgetProps): React.JSX.Element {
  // Determine status
  const getStatus = () => {
    if (!user_project && project.unlocked) {
      return 'available'
    }
    return user_project?.status || 'locked'
  }

  const status = getStatus()

  const widgetClasses = [
    'c-project-widget',
    status,
    className
  ].filter(Boolean).join(' ')

  return (
    <Link href={project.links.self} className={widgetClasses}>
      <div className="flex items-start">
        <Image
          src={project.icon_url}
          alt={project.title}
          width={48}
          height={48}
          className="project-icon"
        />
        <div className="project-info">
          <h3 className="project-title">{project.title}</h3>
          {project.description && (
            <p className="project-description">{project.description}</p>
          )}
          <div className="project-status">
            <span className={`status-badge ${status}`}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

export default ProjectWidget