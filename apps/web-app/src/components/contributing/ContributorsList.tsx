'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'

interface Contributor {
  id: number
  handle: string
  name: string
  avatarUrl: string
  reputation: number
  numContributions: number
  tracks: string[]
  specialties: string[]
}

// Mock data - in real implementation, this would come from API
const mockContributors: Contributor[] = [
  {
    id: 1,
    handle: 'erikschierboom',
    name: 'Erik Schierboom',
    avatarUrl: '/assets/avatars/erik.svg',
    reputation: 15420,
    numContributions: 2847,
    tracks: ['csharp', 'fsharp', 'javascript'],
    specialties: ['Track Maintainer', 'Exercise Author']
  },
  {
    id: 2,
    handle: 'iHiD',
    name: 'Jeremy Walker',
    avatarUrl: '/assets/avatars/jeremy.svg',
    reputation: 25680,
    numContributions: 4521,
    tracks: ['ruby', 'javascript', 'go'],
    specialties: ['Platform Development', 'Mentoring']
  },
  {
    id: 3,
    handle: 'angelikatyborska',
    name: 'Angelika Tyborska',
    avatarUrl: '/assets/avatars/angelika.svg',
    reputation: 12340,
    numContributions: 1876,
    tracks: ['elixir', 'javascript'],
    specialties: ['Exercise Author', 'Track Maintainer']
  }
]

export function ContributorsList() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTrack, setSelectedTrack] = useState('')
  const [sortBy, setSortBy] = useState('reputation')

  const filteredContributors = mockContributors
    .filter(contributor => 
      contributor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contributor.handle.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter(contributor => 
      !selectedTrack || contributor.tracks.includes(selectedTrack)
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'reputation':
          return b.reputation - a.reputation
        case 'contributions':
          return b.numContributions - a.numContributions
        case 'name':
          return a.name.localeCompare(b.name)
        default:
          return 0
      }
    })

  return (
    <div className="contributors-list">
      <div className="filters mb-8 flex flex-wrap gap-4">
        <input
          type="text"
          placeholder="Search contributors..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md flex-1 min-w-[200px]"
        />
        
        <select
          value={selectedTrack}
          onChange={(e) => setSelectedTrack(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md"
        >
          <option value="">All tracks</option>
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="ruby">Ruby</option>
          <option value="go">Go</option>
          <option value="csharp">C#</option>
          <option value="elixir">Elixir</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-md"
        >
          <option value="reputation">Sort by Reputation</option>
          <option value="contributions">Sort by Contributions</option>
          <option value="name">Sort by Name</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredContributors.map((contributor) => (
          <div 
            key={contributor.id}
            className="bg-white p-6 rounded-lg shadow-md border border-gray-200"
          >
            <div className="flex items-center mb-4">
              <Image
                src={contributor.avatarUrl}
                alt={contributor.name}
                width={48}
                height={48}
                className="rounded-full mr-4"
              />
              <div>
                <h3 className="font-semibold text-lg">{contributor.name}</h3>
                <Link 
                  href={`/profiles/${contributor.handle}`}
                  className="text-blue-600 hover:underline"
                >
                  @{contributor.handle}
                </Link>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center mb-2">
                <GraphicalIcon icon="reputation" className="w-4 h-4 mr-2" />
                <span className="text-sm text-gray-600">
                  {contributor.reputation.toLocaleString()} reputation
                </span>
              </div>
              <div className="flex items-center mb-2">
                <GraphicalIcon icon="completed-check-circle" className="w-4 h-4 mr-2" />
                <span className="text-sm text-gray-600">
                  {contributor.numContributions} contributions
                </span>
              </div>
            </div>

            <div className="mb-4">
              <h4 className="font-medium text-sm mb-2">Specialties:</h4>
              <div className="flex flex-wrap gap-1">
                {contributor.specialties.map((specialty) => (
                  <span 
                    key={specialty}
                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                  >
                    {specialty}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-sm mb-2">Tracks:</h4>
              <div className="flex flex-wrap gap-1">
                {contributor.tracks.map((track) => (
                  <span 
                    key={track}
                    className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                  >
                    {track}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredContributors.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No contributors found matching your criteria.</p>
        </div>
      )}
    </div>
  )
}