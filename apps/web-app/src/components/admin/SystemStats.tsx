'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loading } from '@/components/common/Loading'

interface SystemStats {
  users: {
    total: number
    active: number
    mentors: number
    insiders: number
  }
  tracks: {
    total: number
    active: number
    maintained: number
  }
  exercises: {
    total: number
    published: number
    wip: number
  }
  solutions: {
    total: number
    published: number
    completed: number
  }
  discussions: {
    total: number
    active: number
    finished: number
  }
}

export function SystemStats() {
  const { data: stats, isLoading, error } = useQuery<SystemStats>({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/stats')
      if (!response.ok) {
        throw new Error('Failed to fetch system stats')
      }
      return response.json()
    }
  })

  if (isLoading) {
    return <Loading />
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-textColor6">Failed to load system statistics.</p>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  const statCards = [
    {
      title: 'Users',
      items: [
        { label: 'Total Users', value: stats.users.total.toLocaleString() },
        { label: 'Active Users', value: stats.users.active.toLocaleString() },
        { label: 'Mentors', value: stats.users.mentors.toLocaleString() },
        { label: 'Insiders', value: stats.users.insiders.toLocaleString() }
      ]
    },
    {
      title: 'Tracks',
      items: [
        { label: 'Total Tracks', value: stats.tracks.total.toLocaleString() },
        { label: 'Active Tracks', value: stats.tracks.active.toLocaleString() },
        { label: 'Maintained', value: stats.tracks.maintained.toLocaleString() }
      ]
    },
    {
      title: 'Exercises',
      items: [
        { label: 'Total Exercises', value: stats.exercises.total.toLocaleString() },
        { label: 'Published', value: stats.exercises.published.toLocaleString() },
        { label: 'Work in Progress', value: stats.exercises.wip.toLocaleString() }
      ]
    },
    {
      title: 'Solutions',
      items: [
        { label: 'Total Solutions', value: stats.solutions.total.toLocaleString() },
        { label: 'Published', value: stats.solutions.published.toLocaleString() },
        { label: 'Completed', value: stats.solutions.completed.toLocaleString() }
      ]
    },
    {
      title: 'Mentoring',
      items: [
        { label: 'Total Discussions', value: stats.discussions.total.toLocaleString() },
        { label: 'Active', value: stats.discussions.active.toLocaleString() },
        { label: 'Finished', value: stats.discussions.finished.toLocaleString() }
      ]
    }
  ]

  return (
    <div className="system-stats">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((card) => (
          <div key={card.title} className="stat-card bg-backgroundColorA border border-borderColor7 rounded-lg p-6">
            <h3 className="text-h3 mb-4 text-textColor2">{card.title}</h3>
            <div className="space-y-3">
              {card.items.map((item) => (
                <div key={item.label} className="flex justify-between items-center">
                  <span className="text-14 text-textColor6">{item.label}</span>
                  <span className="text-16 font-semibold text-textColor2">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-backgroundColorA border border-borderColor7 rounded-lg p-6">
          <h3 className="text-h3 mb-4 text-textColor2">Recent Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-14">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-textColor6">New user registered: alice_dev</span>
              <span className="text-textColor7 ml-auto">2 min ago</span>
            </div>
            <div className="flex items-center gap-3 text-14">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-textColor6">Exercise published: JavaScript/Hello World</span>
              <span className="text-textColor7 ml-auto">15 min ago</span>
            </div>
            <div className="flex items-center gap-3 text-14">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span className="text-textColor6">Mentoring discussion started</span>
              <span className="text-textColor7 ml-auto">1 hour ago</span>
            </div>
          </div>
        </div>

        <div className="bg-backgroundColorA border border-borderColor7 rounded-lg p-6">
          <h3 className="text-h3 mb-4 text-textColor2">System Health</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-14 text-textColor6">API Response Time</span>
              <span className="text-14 font-medium text-green-600">125ms</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-14 text-textColor6">Database Connections</span>
              <span className="text-14 font-medium text-green-600">8/20</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-14 text-textColor6">Queue Status</span>
              <span className="text-14 font-medium text-green-600">Healthy</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-14 text-textColor6">Cache Hit Rate</span>
              <span className="text-14 font-medium text-green-600">94.2%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}