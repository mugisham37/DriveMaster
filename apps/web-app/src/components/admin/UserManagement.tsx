'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loading } from '@/components/common/Loading'
import { Avatar } from '@/components/common/Avatar'
import { Pagination } from '@/components/common/Pagination'

interface User {
  id: number
  handle: string
  name?: string
  email: string
  avatarUrl: string
  reputation: string
  isMentor: boolean
  isInsider: boolean
  createdAt: string
  lastSeenAt: string
  numSolutions: number
  numMentoringDiscussions: number
}

interface UsersResponse {
  users: User[]
  meta: {
    currentPage: number
    totalCount: number
    totalPages: number
  }
}

export function UserManagement() {
  const [currentPage, setCurrentPage] = useState(1)
  const [roleFilter, setRoleFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const { data, isLoading, error } = useQuery<UsersResponse>({
    queryKey: ['admin', 'users', currentPage, roleFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        role: roleFilter,
        ...(searchQuery && { search: searchQuery })
      })
      
      const response = await fetch(`/api/admin/users?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }
      return response.json()
    }
  })

  const handleToggleRole = async (userId: number, role: 'mentor' | 'insider', currentValue: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/toggle-role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          role, 
          value: !currentValue 
        })
      })

      if (response.ok) {
        window.location.reload()
      }
    } catch (error) {
      console.error('Failed to toggle user role:', error)
    }
  }

  if (isLoading) {
    return <Loading />
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-textColor6">Failed to load users.</p>
      </div>
    )
  }

  const users = data?.users || []
  const meta = data?.meta || { currentPage: 1, totalCount: 0, totalPages: 1 }

  return (
    <div className="user-management">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-h2">User Management</h2>
        
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="form-input w-64"
          />
          
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="form-select"
          >
            <option value="all">All Users</option>
            <option value="mentors">Mentors Only</option>
            <option value="insiders">Insiders Only</option>
            <option value="regular">Regular Users</option>
          </select>
        </div>
      </div>

      <div className="users-table bg-backgroundColorA border border-borderColor7 rounded-lg overflow-hidden">
        <div className="grid grid-cols-8 gap-4 p-4 bg-backgroundColorB border-b border-borderColor7 text-14 font-medium text-textColor6">
          <div>User</div>
          <div>Email</div>
          <div>Reputation</div>
          <div>Solutions</div>
          <div>Mentoring</div>
          <div>Roles</div>
          <div>Last Seen</div>
          <div>Actions</div>
        </div>

        {users.map((user) => (
          <div key={user.id} className="grid grid-cols-8 gap-4 p-4 border-b border-borderColor7 last:border-b-0 items-center">
            <div className="flex items-center gap-3">
              <Avatar src={user.avatarUrl} className="w-8 h-8" />
              <div>
                <div className="font-medium text-textColor2">{user.handle}</div>
                {user.name && (
                  <div className="text-13 text-textColor6">{user.name}</div>
                )}
              </div>
            </div>
            
            <div className="text-13 text-textColor6 truncate">{user.email}</div>
            <div className="text-textColor2">{user.reputation}</div>
            <div className="text-textColor2">{user.numSolutions}</div>
            <div className="text-textColor2">{user.numMentoringDiscussions}</div>
            
            <div className="flex flex-col gap-1">
              {user.isMentor && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-11 font-medium bg-blue-100 text-blue-800">
                  Mentor
                </span>
              )}
              {user.isInsider && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-11 font-medium bg-purple-100 text-purple-800">
                  Insider
                </span>
              )}
            </div>
            
            <div className="text-13 text-textColor6">
              {new Date(user.lastSeenAt).toLocaleDateString()}
            </div>
            
            <div className="flex flex-col gap-1">
              <button
                onClick={() => handleToggleRole(user.id, 'mentor', user.isMentor)}
                className={`btn-xs ${user.isMentor ? 'btn-secondary' : 'btn-primary'}`}
              >
                {user.isMentor ? 'Remove Mentor' : 'Make Mentor'}
              </button>
              <button
                onClick={() => handleToggleRole(user.id, 'insider', user.isInsider)}
                className={`btn-xs ${user.isInsider ? 'btn-secondary' : 'btn-primary'}`}
              >
                {user.isInsider ? 'Remove Insider' : 'Make Insider'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {meta.totalPages > 1 && (
        <div className="mt-6">
          <Pagination
            current={meta.currentPage}
            total={meta.totalPages}
            setPage={setCurrentPage}
          />
        </div>
      )}
    </div>
  )
}