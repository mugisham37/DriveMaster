import React, { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLearningStore, useOfflineStore } from '../store'
import { ContentCategory } from '../types'

const categories: { id: ContentCategory; title: string; description: string; icon: string }[] = [
  {
    id: 'traffic-signs',
    title: 'Traffic Signs',
    description: 'Learn to recognize and understand traffic signs',
    icon: '🚦',
  },
  {
    id: 'road-rules',
    title: 'Road Rules',
    description: 'Master the rules of the road',
    icon: '🛣️',
  },
  {
    id: 'safety-procedures',
    title: 'Safety Procedures',
    description: 'Learn essential safety procedures',
    icon: '🦺',
  },
  {
    id: 'situational-judgment',
    title: 'Situational Judgment',
    description: 'Practice decision-making in various scenarios',
    icon: '🤔',
  },
  {
    id: 'vehicle-operations',
    title: 'Vehicle Operations',
    description: 'Understand vehicle controls and operations',
    icon: '🚗',
  },
]

export default function LearnScreen() {
  const { currentSession, questions, isLoading, startSession, loadQuestions } = useLearningStore()
  const { syncStatus, isOnline } = useOfflineStore()
  const [selectedCategory, setSelectedCategory] = useState<ContentCategory | null>(null)

  useEffect(() => {
    // Load questions when component mounts
    loadQuestions().catch(console.error)
  }, [])

  const handleStartSession = (category: ContentCategory) => {
    if (currentSession) {
      Alert.alert(
        'Session in Progress',
        'You have an active learning session. Do you want to end it and start a new one?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Start New',
            onPress: () => {
              startSession(category)
              setSelectedCategory(category)
            },
          },
        ],
      )
    } else {
      startSession(category)
      setSelectedCategory(category)
    }
  }

  const handleQuickStart = () => {
    startSession()
    setSelectedCategory(null)
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Learn</Text>
          <View style={styles.statusContainer}>
            <View
              style={[styles.statusDot, { backgroundColor: isOnline ? '#34C759' : '#FF3B30' }]}
            />
            <Text style={styles.statusText}>{isOnline ? 'Online' : 'Offline'}</Text>
          </View>
        </View>

        {/* Sync Status */}
        {syncStatus.syncInProgress && (
          <View style={styles.syncBanner}>
            <Text style={styles.syncText}>Syncing data...</Text>
          </View>
        )}

        {syncStatus.pendingUploads > 0 && (
          <View style={styles.pendingBanner}>
            <Text style={styles.pendingText}>{syncStatus.pendingUploads} actions pending sync</Text>
          </View>
        )}

        {/* Current Session */}
        {currentSession && (
          <View style={styles.currentSession}>
            <Text style={styles.sessionTitle}>Current Session</Text>
            <Text style={styles.sessionStats}>
              Questions: {currentSession.questionsAnswered} | Correct:{' '}
              {currentSession.correctAnswers} | Score: {currentSession.totalScore}
            </Text>
            <TouchableOpacity style={styles.continueButton}>
              <Text style={styles.continueButtonText}>Continue Learning</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Start */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Start</Text>
          <TouchableOpacity
            style={styles.quickStartButton}
            onPress={handleQuickStart}
            disabled={isLoading}
          >
            <Text style={styles.quickStartIcon}>⚡</Text>
            <View style={styles.quickStartContent}>
              <Text style={styles.quickStartTitle}>Mixed Practice</Text>
              <Text style={styles.quickStartDescription}>
                Practice questions from all categories
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categories</Text>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={styles.categoryCard}
              onPress={() => handleStartSession(category.id)}
              disabled={isLoading}
            >
              <Text style={styles.categoryIcon}>{category.icon}</Text>
              <View style={styles.categoryContent}>
                <Text style={styles.categoryTitle}>{category.title}</Text>
                <Text style={styles.categoryDescription}>{category.description}</Text>
              </View>
              <Text style={styles.categoryArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Statistics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Progress</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Questions</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>0%</Text>
              <Text style={styles.statLabel}>Accuracy</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Streak</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  syncBanner: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  syncText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 14,
  },
  pendingBanner: {
    backgroundColor: '#FF9500',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  pendingText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 14,
  },
  currentSession: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sessionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  sessionStats: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 12,
  },
  continueButton: {
    backgroundColor: '#34C759',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  quickStartButton: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  quickStartIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  quickStartContent: {
    flex: 1,
  },
  quickStartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  quickStartDescription: {
    fontSize: 14,
    color: '#8E8E93',
  },
  categoryCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  categoryContent: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 14,
    color: '#8E8E93',
  },
  categoryArrow: {
    fontSize: 20,
    color: '#C7C7CC',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
  },
})
