'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loading } from '@/components/common/Loading'
import { MarkdownEditor } from '@/components/common/MarkdownEditor'

interface SiteUpdate {
  id: number
  title: string
  content: string
  contentHtml: string
  isPublished: boolean
  publishedAt?: string
  createdAt: string
  updatedAt: string
  author: {
    handle: string
    avatarUrl: string
  }
}

interface SiteUpdatesResponse {
  updates: SiteUpdate[]
  meta: {
    currentPage: number
    totalCount: number
    totalPages: number
  }
}

export function SiteUpdates() {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingUpdate, setEditingUpdate] = useState<SiteUpdate | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    isPublished: false
  })

  const { data, isLoading, error, refetch } = useQuery<SiteUpdatesResponse>({
    queryKey: ['admin', 'site-updates'],
    queryFn: async () => {
      const response = await fetch('/api/admin/site-updates')
      if (!response.ok) {
        throw new Error('Failed to fetch site updates')
      }
      return response.json()
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const url = editingUpdate 
        ? `/api/admin/site-updates/${editingUpdate.id}`
        : '/api/admin/site-updates'
      
      const method = editingUpdate ? 'PATCH' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setShowCreateForm(false)
        setEditingUpdate(null)
        setFormData({ title: '', content: '', isPublished: false })
        refetch()
      }
    } catch (error) {
      console.error('Failed to save site update:', error)
    }
  }

  const handleEdit = (update: SiteUpdate) => {
    setEditingUpdate(update)
    setFormData({
      title: update.title,
      content: update.content,
      isPublished: update.isPublished
    })
    setShowCreateForm(true)
  }

  const handleDelete = async (updateId: number) => {
    if (!confirm('Are you sure you want to delete this site update?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/site-updates/${updateId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        refetch()
      }
    } catch (error) {
      console.error('Failed to delete site update:', error)
    }
  }

  const handleTogglePublish = async (updateId: number, isPublished: boolean) => {
    try {
      const response = await fetch(`/api/admin/site-updates/${updateId}/toggle-publish`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isPublished: !isPublished })
      })

      if (response.ok) {
        refetch()
      }
    } catch (error) {
      console.error('Failed to toggle publish status:', error)
    }
  }

  if (isLoading) {
    return <Loading />
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-textColor6">Failed to load site updates.</p>
      </div>
    )
  }

  const updates = data?.updates || []

  return (
    <div className="site-updates">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-h2">Site Updates</h2>
        
        <button
          onClick={() => {
            setShowCreateForm(true)
            setEditingUpdate(null)
            setFormData({ title: '', content: '', isPublished: false })
          }}
          className="btn-primary btn-s"
        >
          Create Update
        </button>
      </div>

      {showCreateForm && (
        <div className="create-update-form bg-backgroundColorA border border-borderColor7 rounded-lg p-6 mb-6">
          <h3 className="text-h3 mb-4">
            {editingUpdate ? 'Edit Site Update' : 'Create Site Update'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-14 font-medium text-textColor2 mb-2">
                Title
              </label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="form-input w-full"
                required
              />
            </div>
            
            <div>
              <label htmlFor="content" className="block text-14 font-medium text-textColor2 mb-2">
                Content (Markdown)
              </label>
              <MarkdownEditor
                value={formData.content}
                onChange={(content) => setFormData({ ...formData, content })}
                placeholder="Write your site update content in Markdown..."
              />
            </div>
            
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPublished"
                checked={formData.isPublished}
                onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                className="form-checkbox"
              />
              <label htmlFor="isPublished" className="text-14 text-textColor2">
                Publish immediately
              </label>
            </div>
            
            <div className="flex items-center gap-2">
              <button type="submit" className="btn-primary btn-s">
                {editingUpdate ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false)
                  setEditingUpdate(null)
                }}
                className="btn-secondary btn-s"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="updates-list space-y-4">
        {updates.map((update) => (
          <div key={update.id} className="update-item bg-backgroundColorA border border-borderColor7 rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-h3 text-textColor2 mb-2">{update.title}</h3>
                <div className="flex items-center gap-4 text-13 text-textColor6">
                  <span>By {update.author.handle}</span>
                  <span>Created {new Date(update.createdAt).toLocaleDateString()}</span>
                  {update.publishedAt && (
                    <span>Published {new Date(update.publishedAt).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-12 font-medium ${
                  update.isPublished 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {update.isPublished ? 'Published' : 'Draft'}
                </span>
              </div>
            </div>
            
            <div 
              className="prose prose-sm max-w-none mb-4"
              dangerouslySetInnerHTML={{ __html: update.contentHtml }}
            />
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleEdit(update)}
                className="btn-xs btn-secondary"
              >
                Edit
              </button>
              <button
                onClick={() => handleTogglePublish(update.id, update.isPublished)}
                className={`btn-xs ${update.isPublished ? 'btn-secondary' : 'btn-primary'}`}
              >
                {update.isPublished ? 'Unpublish' : 'Publish'}
              </button>
              <button
                onClick={() => handleDelete(update.id)}
                className="btn-xs btn-danger"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {updates.length === 0 && (
        <div className="text-center py-12">
          <p className="text-textColor6">No site updates found.</p>
        </div>
      )}
    </div>
  )
}