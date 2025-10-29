/**
 * Progress Analytics Dashboard Component
 * 
 * Demonstrates the new progress analytics and visualization capabilities
 * implemented in tasks 6.3 and 6.4
 */

'use client'

import React, { useState, useEffect } from 'react'
import { useProgress } from '@/contexts/ProgressContext'
import type {
  ChartType,
  ProgressTrend,
  TopicComparison,
  PeerComparison,
  ProgressPrediction,
  PracticeRecommendation
} from '@/lib/user-service'

interface ProgressAnalyticsDashboardProps {
  className?: string
}

export function ProgressAnalyticsDashboard({ className = '' }: ProgressAnalyticsDashboardProps) {
  const {
    summary,
    skillMasteries,
    weeklyProgress,
    isLoading,
    getProgressTrends,
    getTopicComparison,
    getPeerComparison,
    getProgressChartData,
    getMasteryHeatmapData,
    generateProgressPredictions,
    generateLearningRecommendations,
  } = useProgress()

  // State for analytics data
  const [trends, setTrends] = useState<ProgressTrend[]>([])
  const [topicComparisons, setTopicComparisons] = useState<TopicComparison[]>([])
  const [peerComparison, setPeerComparison] = useState<PeerComparison | null>(null)
  const [predictions, setPredictions] = useState<ProgressPrediction[]>([])
  const [recommendations, setRecommendations] = useState<PracticeRecommendation[]>([])
  const [selectedChartType, setSelectedChartType] = useState<ChartType>('line')
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false)

  // Load analytics data
  useEffect(() => {
    if (!summary || skillMasteries.size === 0) return

    const loadAnalytics = async () => {
      setIsAnalyticsLoading(true)
      try {
        // Load progress trends
        const trendsData = await getProgressTrends({
          start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
          end: new Date(),
        })
        setTrends(trendsData)

        // Load topic comparisons for top 5 topics
        const topTopics = Array.from(skillMasteries.keys()).slice(0, 5)
        if (topTopics.length > 0) {
          const comparisons = await getTopicComparison(topTopics)
          setTopicComparisons(comparisons)
        }

        // Load peer comparison
        const peerData = await getPeerComparison()
        setPeerComparison(peerData)

        // Generate progress predictions
        const predictionsData = await generateProgressPredictions()
        setPredictions(predictionsData.slice(0, 5)) // Top 5 predictions

        // Generate learning recommendations
        const recommendationsData = await generateLearningRecommendations()
        setRecommendations(recommendationsData.slice(0, 5)) // Top 5 recommendations

      } catch (error) {
        console.error('Failed to load analytics data:', error)
      } finally {
        setIsAnalyticsLoading(false)
      }
    }

    loadAnalytics()
  }, [summary, skillMasteries, getProgressTrends, getTopicComparison, getPeerComparison, generateProgressPredictions, generateLearningRecommendations])

  if (isLoading) {
    return (
      <div className={`progress-analytics-dashboard ${className}`}>
        <div className="loading-state">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className={`progress-analytics-dashboard ${className}`}>
        <div className="empty-state text-center py-8">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Progress Data</h3>
          <p className="text-gray-600">Start practicing to see your analytics dashboard.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`progress-analytics-dashboard ${className}`}>
      <div className="dashboard-header mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Progress Analytics</h2>
        <p className="text-gray-600">
          Comprehensive insights into your learning progress and performance
        </p>
      </div>

      {isAnalyticsLoading && (
        <div className="loading-overlay mb-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              <span className="text-blue-800 text-sm">Loading analytics...</span>
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-grid grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        
        {/* Progress Overview */}
        <div className="overview-card bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Progress Overview</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Overall Mastery</span>
              <span className="font-medium">{Math.round(summary.overallMastery * 100)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Topics Mastered</span>
              <span className="font-medium">{summary.masteredTopics} / {summary.totalTopics}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Learning Streak</span>
              <span className="font-medium">{summary.learningStreak} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Accuracy Rate</span>
              <span className="font-medium">{Math.round(summary.accuracyRate * 100)}%</span>
            </div>
          </div>
        </div>

        {/* Progress Trends */}
        {trends.length > 0 && (
          <div className="trends-card bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Progress Trends</h3>
            <div className="space-y-3">
              {trends.map((trend, index) => (
                <div key={index} className="trend-item">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-600">Trend Direction</span>
                    <span className={`font-medium ${
                      trend.trendDirection === 'up' ? 'text-green-600' : 
                      trend.trendDirection === 'down' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {trend.trendDirection === 'up' ? '↗️ Improving' : 
                       trend.trendDirection === 'down' ? '↘️ Declining' : '→ Stable'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Trend Strength</span>
                    <span className="font-medium">{Math.round(trend.trendStrength * 100)}%</span>
                  </div>
                  {trend.projectedMastery && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">30-day Projection</span>
                      <span className="font-medium">{Math.round(trend.projectedMastery * 100)}%</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Peer Comparison */}
        {peerComparison && (
          <div className="peer-comparison-card bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Peer Comparison</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Your Rank</span>
                <span className="font-medium">#{peerComparison.userRank.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Percentile</span>
                <span className="font-medium">{peerComparison.percentile}th</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Your Mastery</span>
                <span className="font-medium">{Math.round(peerComparison.userMastery * 100)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Average Mastery</span>
                <span className="font-medium">{Math.round(peerComparison.averageMastery * 100)}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Topic Comparisons */}
        {topicComparisons.length > 0 && (
          <div className="topic-comparisons-card bg-white rounded-lg shadow p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Topic Performance</h3>
            <div className="space-y-3">
              {topicComparisons.slice(0, 3).map((comparison, index) => (
                <div key={index} className="topic-item border-b border-gray-100 pb-3 last:border-b-0">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-900">{comparison.topic}</span>
                    <span className="text-sm text-gray-600">{comparison.percentile}th percentile</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      Your: {Math.round(comparison.userMastery * 100)}%
                    </span>
                    <span className="text-gray-600">
                      Avg: {Math.round(comparison.averageMastery * 100)}%
                    </span>
                    <span className={`font-medium ${
                      comparison.masteryGap > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {comparison.masteryGap > 0 ? '+' : ''}{Math.round(comparison.masteryGap * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress Predictions */}
        {predictions.length > 0 && (
          <div className="predictions-card bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Progress Predictions</h3>
            <div className="space-y-3">
              {predictions.slice(0, 3).map((prediction, index) => (
                <div key={index} className="prediction-item border-b border-gray-100 pb-3 last:border-b-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-gray-900">{prediction.topic}</span>
                    <span className="text-sm text-gray-600">
                      {prediction.timeToMastery}d to mastery
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Current: {Math.round(prediction.currentMastery * 100)}%</span>
                    <span>Predicted: {Math.round(prediction.predictedMastery * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Learning Recommendations */}
        {recommendations.length > 0 && (
          <div className="recommendations-card bg-white rounded-lg shadow p-6 lg:col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Learning Recommendations</h3>
            <div className="space-y-3">
              {recommendations.slice(0, 3).map((recommendation, index) => (
                <div key={index} className="recommendation-item border-l-4 border-blue-400 pl-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium px-2 py-1 rounded ${
                      recommendation.priority === 'high' ? 'bg-red-100 text-red-800' :
                      recommendation.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {recommendation.priority.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">
                      {Math.round(recommendation.estimatedImpact * 100)}% impact
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{recommendation.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chart Type Selector */}
        <div className="chart-selector-card bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Visualization</h3>
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Chart Type</label>
            <select
              value={selectedChartType}
              onChange={(e) => setSelectedChartType(e.target.value as ChartType)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="line">Line Chart</option>
              <option value="bar">Bar Chart</option>
              <option value="radar">Radar Chart</option>
              <option value="doughnut">Doughnut Chart</option>
              <option value="area">Area Chart</option>
            </select>
            <button
              onClick={() => {
                getProgressChartData(selectedChartType).then(chartData => {
                  console.log('Generated chart data:', chartData)
                  // In a real implementation, this would render the chart
                }).catch(console.error)
              }}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md text-sm hover:bg-blue-700 transition-colors"
            >
              Generate Chart
            </button>
            <button
              onClick={() => {
                getMasteryHeatmapData().then(heatmapData => {
                  console.log('Generated heatmap data:', heatmapData)
                  // In a real implementation, this would render the heatmap
                }).catch(console.error)
              }}
              className="w-full bg-purple-600 text-white py-2 px-4 rounded-md text-sm hover:bg-purple-700 transition-colors"
            >
              Generate Heatmap
            </button>
          </div>
        </div>

      </div>

      {/* Debug Information */}
      <div className="debug-info mt-8 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Debug Information</h4>
        <div className="text-xs text-gray-600 space-y-1">
          <div>Analytics loaded: {isAnalyticsLoading ? 'Loading...' : 'Complete'}</div>
          <div>Trends: {trends.length} items</div>
          <div>Topic comparisons: {topicComparisons.length} items</div>
          <div>Predictions: {predictions.length} items</div>
          <div>Recommendations: {recommendations.length} items</div>
          <div>Skill masteries: {skillMasteries.size} topics</div>
          <div>Weekly progress: {weeklyProgress.length} weeks</div>
        </div>
      </div>
    </div>
  )
}

export default ProgressAnalyticsDashboard