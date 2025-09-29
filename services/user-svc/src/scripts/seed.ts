#!/usr/bin/env tsx

import { db } from '../db/connection'
import {
  users,
  concepts,
  content,
  achievements,
  knowledgeStates,
  CognitivePatterns,
  LearningPreferences,
  ContentMetadata,
} from '../db/schema'
import bcrypt from 'bcrypt'

// Sample cognitive patterns for different user types
const cognitivePatterns: CognitivePatterns[] = [
  {
    learningStyle: 'visual',
    processingSpeed: 1.2,
    attentionSpan: 25,
    preferredSessionLength: 20,
    optimalTimeOfDay: ['morning', 'afternoon'],
    difficultyPreference: 'gradual',
    feedbackPreference: 'immediate',
  },
  {
    learningStyle: 'auditory',
    processingSpeed: 0.9,
    attentionSpan: 30,
    preferredSessionLength: 25,
    optimalTimeOfDay: ['afternoon', 'evening'],
    difficultyPreference: 'challenging',
    feedbackPreference: 'summary',
  },
  {
    learningStyle: 'kinesthetic',
    processingSpeed: 1.1,
    attentionSpan: 20,
    preferredSessionLength: 15,
    optimalTimeOfDay: ['morning'],
    difficultyPreference: 'mixed',
    feedbackPreference: 'immediate',
  },
]

// Sample learning preferences
const learningPreferences: LearningPreferences[] = [
  {
    enableNotifications: true,
    notificationFrequency: 'medium',
    studyReminders: true,
    socialFeatures: true,
    gamificationEnabled: true,
    preferredLanguage: 'en',
    accessibilityOptions: {
      highContrast: false,
      largeText: false,
      screenReader: false,
      reducedMotion: false,
    },
  },
  {
    enableNotifications: false,
    notificationFrequency: 'low',
    studyReminders: false,
    socialFeatures: false,
    gamificationEnabled: true,
    preferredLanguage: 'en',
    accessibilityOptions: {
      highContrast: true,
      largeText: true,
      screenReader: false,
      reducedMotion: true,
    },
  },
]

// Sample concepts for driving test
const sampleConcepts = [
  {
    key: 'traffic-signs-regulatory',
    name: 'Regulatory Traffic Signs',
    description: 'Signs that inform drivers of traffic laws and regulations',
    category: 'traffic_signs' as const,
    baseDifficulty: 0.3,
    estimatedLearningTime: 15,
    prerequisites: [],
  },
  {
    key: 'traffic-signs-warning',
    name: 'Warning Traffic Signs',
    description: 'Signs that alert drivers to potential hazards ahead',
    category: 'traffic_signs' as const,
    baseDifficulty: 0.4,
    estimatedLearningTime: 20,
    prerequisites: ['traffic-signs-regulatory'],
  },
  {
    key: 'right-of-way-basics',
    name: 'Basic Right-of-Way Rules',
    description: 'Fundamental rules about who has the right of way in different situations',
    category: 'road_rules' as const,
    baseDifficulty: 0.5,
    estimatedLearningTime: 25,
    prerequisites: [],
  },
  {
    key: 'intersection-rules',
    name: 'Intersection Navigation',
    description: 'Rules and procedures for safely navigating intersections',
    category: 'road_rules' as const,
    baseDifficulty: 0.6,
    estimatedLearningTime: 30,
    prerequisites: ['right-of-way-basics'],
  },
  {
    key: 'defensive-driving',
    name: 'Defensive Driving Techniques',
    description: 'Proactive driving strategies to prevent accidents',
    category: 'safety_procedures' as const,
    baseDifficulty: 0.7,
    estimatedLearningTime: 35,
    prerequisites: ['right-of-way-basics'],
  },
  {
    key: 'emergency-procedures',
    name: 'Emergency Response Procedures',
    description: 'How to respond to various emergency situations while driving',
    category: 'safety_procedures' as const,
    baseDifficulty: 0.8,
    estimatedLearningTime: 40,
    prerequisites: ['defensive-driving'],
  },
]

// Sample content for each concept
const generateSampleContent = (conceptId: string, conceptKey: string) => {
  const contentItems = []

  // Generate 5-10 content items per concept
  const itemCount = Math.floor(Math.random() * 6) + 5

  for (let i = 0; i < itemCount; i++) {
    const metadata: ContentMetadata = {
      tags: [conceptKey, 'practice', 'test'],
      estimatedTime: Math.floor(Math.random() * 120) + 30, // 30-150 seconds
      mediaType: ['text', 'image', 'video'][Math.floor(Math.random() * 3)] as any,
      accessibility: {
        altText: 'Sample alt text for accessibility',
        captions: Math.random() > 0.5,
        transcript: Math.random() > 0.7,
      },
      lastReviewed: new Date().toISOString(),
      reviewerNotes: 'Generated sample content for testing',
    }

    contentItems.push({
      conceptId,
      title: `${conceptKey.replace(/-/g, ' ')} - Question ${i + 1}`,
      body: `Sample question content for ${conceptKey} concept. This is question ${i + 1} of ${itemCount}.`,
      category: sampleConcepts.find((c) => c.key === conceptKey)?.category || 'road_rules',
      difficulty: Math.random() * 2 - 1, // -1 to +1 scale
      discrimination: Math.random() * 1.5 + 0.5, // 0.5 to 2.0 scale
      guessParameter: Math.random() * 0.3 + 0.1, // 0.1 to 0.4 scale
      metadata,
    })
  }

  return contentItems
}

// Sample achievements
const sampleAchievements = [
  {
    key: 'first-question',
    name: 'Getting Started',
    description: 'Answer your first question correctly',
    category: 'milestone',
    xpReward: 10,
    badgeIcon: '🎯',
    requirements: { questionsCorrect: 1 },
  },
  {
    key: 'streak-7',
    name: 'Week Warrior',
    description: 'Maintain a 7-day learning streak',
    category: 'streak',
    xpReward: 50,
    badgeIcon: '🔥',
    requirements: { streakDays: 7 },
  },
  {
    key: 'concept-master',
    name: 'Concept Master',
    description: 'Master your first concept',
    category: 'mastery',
    xpReward: 100,
    badgeIcon: '🏆',
    requirements: { conceptsMastered: 1 },
  },
  {
    key: 'social-butterfly',
    name: 'Social Butterfly',
    description: 'Add your first friend',
    category: 'social',
    xpReward: 25,
    badgeIcon: '👥',
    requirements: { friendsAdded: 1 },
  },
  {
    key: 'perfectionist',
    name: 'Perfectionist',
    description: 'Answer 10 questions in a row correctly',
    category: 'performance',
    xpReward: 75,
    badgeIcon: '💯',
    requirements: { perfectStreak: 10 },
  },
]

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...')

    // 1. Create sample users
    console.log('Creating sample users...')
    const hashedPassword = await bcrypt.hash('password123', 10)

    const sampleUsers = [
      {
        email: 'demo@drivemaster.com',
        passwordHash: hashedPassword,
        firstName: 'Demo',
        lastName: 'User',
        cognitivePatterns: cognitivePatterns[0],
        learningPreferences: learningPreferences[0],
        totalXP: 150,
        currentStreak: 3,
        longestStreak: 7,
        emailVerified: true,
      },
      {
        email: 'test@drivemaster.com',
        passwordHash: hashedPassword,
        firstName: 'Test',
        lastName: 'Learner',
        cognitivePatterns: cognitivePatterns[1],
        learningPreferences: learningPreferences[1],
        totalXP: 75,
        currentStreak: 1,
        longestStreak: 3,
        emailVerified: true,
      },
      {
        email: 'student@drivemaster.com',
        passwordHash: hashedPassword,
        firstName: 'Student',
        lastName: 'Driver',
        cognitivePatterns: cognitivePatterns[2],
        learningPreferences: learningPreferences[0],
        totalXP: 300,
        currentStreak: 5,
        longestStreak: 12,
        emailVerified: true,
      },
    ]

    const insertedUsers = await db.insert(users).values(sampleUsers).returning()
    console.log(`✅ Created ${insertedUsers.length} sample users`)

    // 2. Create concepts
    console.log('Creating sample concepts...')
    const insertedConcepts = await db.insert(concepts).values(sampleConcepts).returning()
    console.log(`✅ Created ${insertedConcepts.length} concepts`)

    // 3. Create content for each concept
    console.log('Creating sample content...')
    let totalContentItems = 0

    for (const concept of insertedConcepts) {
      const conceptContent = generateSampleContent(concept.id, concept.key)
      await db.insert(content).values(conceptContent)
      totalContentItems += conceptContent.length
    }
    console.log(`✅ Created ${totalContentItems} content items`)

    // 4. Create achievements
    console.log('Creating sample achievements...')
    const insertedAchievements = await db
      .insert(achievements)
      .values(sampleAchievements)
      .returning()
    console.log(`✅ Created ${insertedAchievements.length} achievements`)

    // 5. Create initial knowledge states for users
    console.log('Creating initial knowledge states...')
    const knowledgeStateData = []

    for (const user of insertedUsers) {
      for (const concept of insertedConcepts) {
        // Create varied initial knowledge states
        const initialKnowledge = Math.random() * 0.3 + 0.1 // 0.1 to 0.4
        const masteryProbability = Math.random() * 0.5 + 0.1 // 0.1 to 0.6

        knowledgeStateData.push({
          userId: user.id,
          conceptId: concept.id,
          initialKnowledge,
          learningRate: Math.random() * 0.4 + 0.2, // 0.2 to 0.6
          guessParameter: Math.random() * 0.2 + 0.15, // 0.15 to 0.35
          slipParameter: Math.random() * 0.15 + 0.05, // 0.05 to 0.2
          masteryProbability,
          personalLearningVelocity: Math.random() * 0.6 + 0.7, // 0.7 to 1.3
          confidenceLevel: Math.random() * 0.4 + 0.3, // 0.3 to 0.7
          interactionCount: Math.floor(Math.random() * 10),
          correctCount: Math.floor(Math.random() * 5),
        })
      }
    }

    await db.insert(knowledgeStates).values(knowledgeStateData)
    console.log(`✅ Created ${knowledgeStateData.length} knowledge state records`)

    console.log('\n🎉 Database seeding completed successfully!')
    console.log('\n📊 Seeding Summary:')
    console.log(`  Users: ${insertedUsers.length}`)
    console.log(`  Concepts: ${insertedConcepts.length}`)
    console.log(`  Content Items: ${totalContentItems}`)
    console.log(`  Achievements: ${insertedAchievements.length}`)
    console.log(`  Knowledge States: ${knowledgeStateData.length}`)

    console.log('\n🔑 Sample Login Credentials:')
    console.log('  Email: demo@drivemaster.com')
    console.log('  Password: password123')
  } catch (error) {
    console.error('❌ Database seeding failed:', error)
    throw error
  }
}

async function clearDatabase() {
  try {
    console.log('🧹 Clearing database...')

    // Clear tables in reverse dependency order
    await db.delete(knowledgeStates)
    await db.delete(content)
    await db.delete(concepts)
    await db.delete(achievements)
    await db.delete(users)

    console.log('✅ Database cleared successfully')
  } catch (error) {
    console.error('❌ Database clearing failed:', error)
    throw error
  }
}

async function main() {
  const command = process.argv[2]

  try {
    switch (command) {
      case 'seed':
        await seedDatabase()
        break

      case 'clear':
        await clearDatabase()
        break

      case 'reset':
        await clearDatabase()
        await seedDatabase()
        break

      default:
        console.log(`
🌱 DriveMaster Database Seeding Tool

Usage: pnpm db:seed <command>

Commands:
  seed     Populate database with sample data
  clear    Remove all data from tables
  reset    Clear and re-seed database

Examples:
  pnpm db:seed seed
  pnpm db:seed reset
        `)
        process.exit(1)
    }
  } catch (error) {
    console.error('Seeding operation failed:', error)
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
