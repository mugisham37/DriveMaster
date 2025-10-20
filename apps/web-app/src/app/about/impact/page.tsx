import React from 'react'
import { Metadata } from 'next'
import { ImpactPage } from '@/components/impact'

export const metadata: Metadata = {
  title: 'Impact - Exercism',
  description: 'See the impact Exercism has made in providing free programming education worldwide.'
}

async function getImpactData() {
  try {
    // Fetch impact stats
    const statsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/impact/stats`, {
      next: { revalidate: 3600 } // Revalidate every hour
    })
    
    if (!statsResponse.ok) {
      throw new Error('Failed to fetch stats')
    }
    
    const stats = await statsResponse.json()

    // Fetch metrics
    const metricsResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/impact/metrics`, {
      next: { revalidate: 300 } // Revalidate every 5 minutes
    })
    
    let metrics = []
    if (metricsResponse.ok) {
      const metricsData = await metricsResponse.json()
      metrics = metricsData.metrics || []
    }

    return {
      usersCount: stats.num_users || 1250000,
      submissionsCount: stats.num_submissions || 8500000,
      discussionsCount: stats.num_discussions || 450000,
      usersPerMonth: JSON.stringify(stats.users_per_month || {}),
      milestones: JSON.stringify(stats.milestones || []),
      metrics: metrics
    }
  } catch (error) {
    console.error('Error fetching impact data:', error)
    
    // Return fallback data
    return {
      usersCount: 1250000,
      submissionsCount: 8500000,
      discussionsCount: 450000,
      usersPerMonth: JSON.stringify({
        '202201': 39627,
        '202202': 37265,
        '202203': 31452,
        '202204': 32129,
        '202205': 30835,
        '202206': 27225,
        '202207': 28627,
        '202208': 31832,
        '202209': 31832
      }),
      milestones: JSON.stringify([
        { date: '202207', text: 'Reached 1M users!', emoji: '🤩' },
        { date: '202109', text: 'Exercism v3', emoji: '3️⃣' },
        { date: '202006', text: 'Automated feedback!', emoji: '🤖' },
        { date: '201807', text: 'Exercism v2', emoji: '2️⃣' },
        { date: '201312', text: 'Exercism launched', emoji: '🚀' }
      ]),
      metrics: []
    }
  }
}

export default async function ImpactPageRoute() {
  const impactData = await getImpactData()

  return <ImpactPage {...impactData} />
}