import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'crypto'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting analytics service database seeding...')
  
  // Clear existing data
  await prisma.prediction.deleteMany()
  await prisma.predictionValidation.deleteMany()
  await prisma.predictionModel.deleteMany()
  await prisma.alert.deleteMany()
  await prisma.abTestResult.deleteMany()
  await prisma.cohortAnalysis.deleteMany()
  await prisma.funnelStep.deleteMany()
  await prisma.funnel.deleteMany()
  await prisma.dashboard.deleteMany()
  await prisma.conceptAnalytics.deleteMany()
  await prisma.userBehaviorProfile.deleteMany()
  await prisma.metricAggregation.deleteMany()
  await prisma.learningEventStream.deleteMany()
  await prisma.processingStatus.deleteMany()

  // Create processing status entries
  const processingStatuses = [
    {
      pipelineName: 'learning_events_processor',
      status: 'RUNNING',
      lastProcessed: new Date(),
      processedCount: 15423,
      errorCount: 12,
      metrics: {
        averageLatency: 120,
        throughputPerSecond: 45,
        memoryUsageMB: 256
      }
    },
    {
      pipelineName: 'user_behavior_analyzer',
      status: 'RUNNING', 
      lastProcessed: new Date(),
      processedCount: 8934,
      errorCount: 3,
      metrics: {
        averageLatency: 340,
        throughputPerSecond: 12,
        memoryUsageMB: 512
      }
    },
    {
      pipelineName: 'predictive_model_updater',
      status: 'IDLE',
      lastProcessed: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      processedCount: 234,
      errorCount: 0,
      metrics: {
        averageLatency: 2400,
        throughputPerSecond: 0.5,
        memoryUsageMB: 1024
      }
    }
  ]

  for (const status of processingStatuses) {
    await prisma.processingStatus.create({
      data: status
    })
  }

  // Create learning event streams (recent events for testing)
  const users = ['user-001', 'user-002', 'user-003', 'user-004', 'user-005']
  const concepts = ['traffic-rules', 'road-signs', 'parking', 'emergency-procedures', 'vehicle-maintenance']
  const eventTypes = ['question_answered', 'quiz_completed', 'lesson_started', 'lesson_completed', 'assessment_taken']
  
  const learningEvents = []
  for (let i = 0; i < 100; i++) {
    const userId = users[Math.floor(Math.random() * users.length)]
    const conceptKey = concepts[Math.floor(Math.random() * concepts.length)]
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)]
    const timeOffset = Math.random() * 7 * 24 * 60 * 60 * 1000 // Last 7 days
    
    learningEvents.push({
      eventId: randomUUID(),
      userId,
      sessionId: `session-${userId}-${Math.floor(timeOffset / (60 * 60 * 1000))}`,
      conceptKey,
      itemId: `item-${conceptKey}-${Math.floor(Math.random() * 20) + 1}`,
      eventType,
      correct: Math.random() > 0.3 ? true : false, // 70% accuracy
      responseTime: Math.floor(Math.random() * 60000) + 5000, // 5-65 seconds
      confidence: Math.floor(Math.random() * 5) + 1,
      attempts: Math.random() > 0.8 ? 2 : 1,
      deviceType: Math.random() > 0.7 ? 'mobile' : 'desktop',
      timeOfDay: Math.floor(Math.random() * 24),
      studyStreak: Math.floor(Math.random() * 30),
      masteryBefore: Math.random() * 0.8,
      masteryAfter: Math.random() * 0.9 + 0.1,
      difficultyRating: Math.random() * 5,
      engagementScore: Math.random() * 0.7 + 0.3, // 0.3-1.0
      rawEventData: {
        browser: 'Chrome',
        source: 'web-app',
        feature_flags: ['adaptive_difficulty', 'spaced_repetition']
      },
      processed: Math.random() > 0.1, // 90% processed
      processedAt: Math.random() > 0.1 ? new Date(Date.now() - timeOffset) : null,
      createdAt: new Date(Date.now() - timeOffset)
    })
  }

  await prisma.learningEventStream.createMany({
    data: learningEvents
  })

  // Create metric aggregations for different time windows
  const metricNames = ['accuracy_rate', 'response_time', 'engagement_score', 'session_count', 'completion_rate']
  const timeWindows = ['1m', '5m', '1h', '1d']
  
  for (const metricName of metricNames) {
    for (const timeWindow of timeWindows) {
      for (const userId of users) {
        for (const conceptKey of concepts) {
          // Create aggregations for the last few time windows
          for (let i = 0; i < 10; i++) {
            const windowStart = new Date(Date.now() - i * getWindowMilliseconds(timeWindow))
            const windowEnd = new Date(windowStart.getTime() + getWindowMilliseconds(timeWindow))
            
            const baseValue = getBaseValueForMetric(metricName)
            const variance = (Math.random() - 0.5) * 0.3
            const value = Math.max(0, baseValue + baseValue * variance)
            
            await prisma.metricAggregation.create({
              data: {
                metricName,
                metricType: getMetricTypeForMetric(metricName),
                aggregation: 'AVERAGE',
                timeWindow,
                windowStart,
                windowEnd,
                userId,
                conceptKey,
                value,
                count: Math.floor(Math.random() * 20) + 1,
                sum: value * (Math.floor(Math.random() * 20) + 1),
                min: Math.max(0, value - Math.random() * value * 0.5),
                max: value + Math.random() * value * 0.5,
                avg: value,
                dimensions: { device_type: 'all', region: 'global' }
              }
            })
          }
        }
      }
    }
  }

  // Create user behavior profiles
  const behaviorSegments = ['new_user', 'casual', 'regular', 'high_achiever', 'struggling']
  
  for (const userId of users) {
    const segment = behaviorSegments[Math.floor(Math.random() * behaviorSegments.length)]
    const baseAccuracy = segment === 'high_achiever' ? 0.85 : segment === 'struggling' ? 0.45 : 0.65
    
    await prisma.userBehaviorProfile.create({
      data: {
        userId,
        avgAccuracy: baseAccuracy + (Math.random() - 0.5) * 0.2,
        avgResponseTime: Math.floor(Math.random() * 30000) + 10000, // 10-40 seconds
        avgConfidence: Math.random() * 2 + 3, // 3-5
        preferredStudyTime: ['morning', 'afternoon', 'evening'][Math.floor(Math.random() * 3)],
        avgSessionDuration: Math.floor(Math.random() * 45) + 15, // 15-60 minutes
        dropoutRisk: segment === 'struggling' ? Math.random() * 0.5 + 0.5 : Math.random() * 0.3,
        successProbability: segment === 'high_achiever' ? Math.random() * 0.3 + 0.7 : Math.random() * 0.6 + 0.2,
        engagementRisk: Math.random() * 0.4,
        segment,
        dataPoints: Math.floor(Math.random() * 200) + 50,
        lastAnalyzed: new Date(),
        behaviorPatterns: {
          peak_hours: [9, 14, 20],
          preferred_difficulty: segment === 'high_achiever' ? 'hard' : 'medium',
          learning_velocity: Math.random() * 5 + 1
        }
      }
    })
  }

  // Create concept analytics
  for (const conceptKey of concepts) {
    const periods = ['daily', 'weekly', 'monthly']
    
    for (const period of periods) {
      // Create analytics for the last several periods
      const numPeriods = period === 'daily' ? 30 : period === 'weekly' ? 12 : 6
      
      for (let i = 0; i < numPeriods; i++) {
        const periodStart = new Date()
        const periodEnd = new Date()
        
        if (period === 'daily') {
          periodStart.setDate(periodStart.getDate() - i)
          periodEnd.setDate(periodEnd.getDate() - i + 1)
        } else if (period === 'weekly') {
          periodStart.setDate(periodStart.getDate() - i * 7)
          periodEnd.setDate(periodEnd.getDate() - (i - 1) * 7)
        } else {
          periodStart.setMonth(periodStart.getMonth() - i)
          periodEnd.setMonth(periodEnd.getMonth() - i + 1)
        }
        
        const usageCount = Math.floor(Math.random() * 100) + 20
        const completionRate = Math.random() * 0.3 + 0.6 // 60-90%
        
        await prisma.conceptAnalytics.create({
          data: {
            conceptKey,
            period,
            periodStart,
            periodEnd,
            usageCount,
            completionRate,
            avgAccuracy: Math.random() * 0.4 + 0.5, // 50-90%
            avgResponseTime: Math.floor(Math.random() * 20000) + 10000,
            difficultyRating: Math.random() * 2 + 3, // 3-5
            engagementScore: Math.random() * 0.4 + 0.5,
            dropoffPoints: [
              { step: 'introduction', rate: Math.random() * 0.1 },
              { step: 'practice', rate: Math.random() * 0.2 },
              { step: 'assessment', rate: Math.random() * 0.15 }
            ],
            learningOutcomes: {
              mastery_achieved: Math.floor(completionRate * usageCount * 0.8),
              needs_review: Math.floor(completionRate * usageCount * 0.15),
              requires_help: Math.floor(completionRate * usageCount * 0.05)
            },
            qualityMetrics: {
              content_rating: Math.random() * 1.5 + 3.5, // 3.5-5.0
              feedback_score: Math.random() * 0.3 + 0.7,
              improvement_suggestions: Math.floor(Math.random() * 5)
            }
          }
        })
      }
    }
  }

  // Create alerts
  const alertTypes = ['performance_drop', 'low_engagement', 'high_dropout_risk', 'content_quality_issue', 'system_anomaly']
  const severities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
  const statuses = ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED']
  
  for (let i = 0; i < 20; i++) {
    const alertType = alertTypes[Math.floor(Math.random() * alertTypes.length)]
    const severity = severities[Math.floor(Math.random() * severities.length)]
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    const entityType = Math.random() > 0.5 ? 'user' : 'concept'
    const entityId = entityType === 'user' ? users[Math.floor(Math.random() * users.length)] : concepts[Math.floor(Math.random() * concepts.length)]
    
    await prisma.alert.create({
      data: {
        alertType,
        severity,
        status,
        entityType,
        entityId,
        title: `${alertType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Alert`,
        description: `Alert triggered for ${entityType} ${entityId}: ${alertType}`,
        threshold: Math.random() * 100,
        actualValue: Math.random() * 150,
        dimensions: {
          region: 'global',
          device_type: 'all',
          user_segment: 'all'
        },
        resolvedAt: status === 'RESOLVED' ? new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000) : null,
        resolvedBy: status === 'RESOLVED' ? 'system' : null
      }
    })
  }

  // Create prediction models
  const predictionModels = [
    {
      modelName: 'dropout_prediction',
      modelType: 'binary_classification',
      targetVariable: 'will_dropout',
      features: ['avgAccuracy', 'engagementScore', 'sessionFrequency', 'studyStreak', 'responseTimeVariance'],
      algorithm: 'logistic_regression',
      hyperparameters: {
        regularization: 'l2',
        C: 1.0,
        max_iter: 1000,
        solver: 'lbfgs'
      },
      modelVersion: '1.2.3',
      trainingDataSize: 50000,
      validationAccuracy: 0.847,
      precision: 0.821,
      recall: 0.756,
      f1Score: 0.787,
      rocAuc: 0.892,
      isActive: true,
      trainedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      modelMetadata: {
        feature_importance: {
          avgAccuracy: 0.35,
          engagementScore: 0.28,
          sessionFrequency: 0.18,
          studyStreak: 0.12,
          responseTimeVariance: 0.07
        },
        cross_validation_scores: [0.832, 0.851, 0.839, 0.855, 0.843],
        model_size_mb: 12.5
      }
    },
    {
      modelName: 'performance_forecast',
      modelType: 'regression',
      targetVariable: 'future_accuracy',
      features: ['currentMastery', 'learningVelocity', 'timeSpent', 'conceptDifficulty', 'priorKnowledge'],
      algorithm: 'random_forest',
      hyperparameters: {
        n_estimators: 100,
        max_depth: 15,
        min_samples_split: 5,
        min_samples_leaf: 2,
        random_state: 42
      },
      modelVersion: '2.1.0',
      trainingDataSize: 35000,
      validationAccuracy: 0.782,
      precision: null,
      recall: null,
      f1Score: null,
      rocAuc: null,
      isActive: true,
      trainedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      modelMetadata: {
        feature_importance: {
          currentMastery: 0.42,
          learningVelocity: 0.31,
          timeSpent: 0.15,
          conceptDifficulty: 0.08,
          priorKnowledge: 0.04
        },
        mae: 0.083,
        rmse: 0.125,
        r2_score: 0.782
      }
    },
    {
      modelName: 'engagement_forecast',
      modelType: 'regression',
      targetVariable: 'engagement_score',
      features: ['socialEngagement', 'streakMaintenance', 'avgSessionDuration', 'challengeParticipation', 'timeOfDay'],
      algorithm: 'gradient_boosting',
      hyperparameters: {
        n_estimators: 150,
        learning_rate: 0.1,
        max_depth: 8,
        subsample: 0.8,
        random_state: 42
      },
      modelVersion: '1.5.2',
      trainingDataSize: 28000,
      validationAccuracy: 0.698,
      precision: null,
      recall: null,
      f1Score: null,
      rocAuc: null,
      isActive: true,
      trainedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      modelMetadata: {
        feature_importance: {
          socialEngagement: 0.38,
          streakMaintenance: 0.25,
          avgSessionDuration: 0.19,
          challengeParticipation: 0.12,
          timeOfDay: 0.06
        },
        mae: 0.125,
        rmse: 0.187,
        r2_score: 0.698
      }
    }
  ]

  for (const model of predictionModels) {
    await prisma.predictionModel.create({
      data: model
    })
  }

  // Create predictions for testing
  for (let i = 0; i < 50; i++) {
    const modelName = predictionModels[Math.floor(Math.random() * predictionModels.length)].modelName
    const entityType = ['user', 'session', 'concept'][Math.floor(Math.random() * 3)]
    const entityId = entityType === 'user' ? users[Math.floor(Math.random() * users.length)] : 
                     entityType === 'concept' ? concepts[Math.floor(Math.random() * concepts.length)] : 
                     `session-${randomUUID().slice(0, 8)}`
    
    const prediction = await prisma.prediction.create({
      data: {
        modelName,
        predictionId: randomUUID(),
        entityType,
        entityId,
        prediction: Math.random(),
        confidence: Math.random() * 0.4 + 0.6, // 60-100%
        features: {
          avgAccuracy: Math.random(),
          engagementScore: Math.random(),
          sessionFrequency: Math.random() * 10,
          studyStreak: Math.floor(Math.random() * 30)
        },
        contextData: {
          timestamp: new Date().toISOString(),
          source: 'real_time_analytics',
          version: '1.0'
        }
      }
    })

    // Create validation for some predictions (simulating ground truth)
    if (Math.random() > 0.7) {
      await prisma.predictionValidation.create({
        data: {
          predictionId: prediction.predictionId,
          actualOutcome: Math.random(),
          validatedAt: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000),
          accuracy: Math.random() * 0.4 + 0.6,
          validationMetrics: {
            absolute_error: Math.random() * 0.2,
            squared_error: Math.random() * 0.04,
            within_threshold: Math.random() > 0.3
          }
        }
      })
    }
  }

  // Create dashboards
  const dashboards = [
    {
      name: 'Learning Analytics Overview',
      slug: 'learning-overview',
      description: 'Comprehensive overview of learning metrics and user performance',
      layout: {
        widgets: [
          { type: 'metric_card', metric: 'total_users', position: { x: 0, y: 0, w: 3, h: 2 } },
          { type: 'metric_card', metric: 'active_sessions', position: { x: 3, y: 0, w: 3, h: 2 } },
          { type: 'chart', metric: 'accuracy_trend', position: { x: 0, y: 2, w: 6, h: 4 } },
          { type: 'table', metric: 'concept_performance', position: { x: 0, y: 6, w: 6, h: 4 } }
        ]
      },
      isPublic: true,
      createdBy: 'admin',
      sharedWith: [],
      viewCount: Math.floor(Math.random() * 500) + 100,
      lastViewed: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000)
    },
    {
      name: 'User Engagement Dashboard',
      slug: 'user-engagement',
      description: 'Track user engagement patterns and behavior analytics',
      layout: {
        widgets: [
          { type: 'chart', metric: 'engagement_by_hour', position: { x: 0, y: 0, w: 4, h: 3 } },
          { type: 'chart', metric: 'session_duration', position: { x: 4, y: 0, w: 4, h: 3 } },
          { type: 'heatmap', metric: 'activity_heatmap', position: { x: 0, y: 3, w: 8, h: 4 } },
          { type: 'list', metric: 'at_risk_users', position: { x: 0, y: 7, w: 4, h: 3 } }
        ]
      },
      isPublic: false,
      createdBy: 'instructor-001',
      sharedWith: ['admin', 'instructor-002'],
      viewCount: Math.floor(Math.random() * 200) + 50,
      lastViewed: new Date(Date.now() - Math.random() * 12 * 60 * 60 * 1000)
    },
    {
      name: 'Predictive Analytics',
      slug: 'predictive-analytics',
      description: 'ML model performance and predictions dashboard',
      layout: {
        widgets: [
          { type: 'metric_card', metric: 'model_accuracy', position: { x: 0, y: 0, w: 2, h: 2 } },
          { type: 'metric_card', metric: 'predictions_today', position: { x: 2, y: 0, w: 2, h: 2 } },
          { type: 'chart', metric: 'dropout_risk_distribution', position: { x: 0, y: 2, w: 4, h: 3 } },
          { type: 'chart', metric: 'model_performance_trends', position: { x: 0, y: 5, w: 4, h: 3 } }
        ]
      },
      isPublic: false,
      createdBy: 'admin',
      sharedWith: ['data-scientist'],
      viewCount: Math.floor(Math.random() * 100) + 20,
      lastViewed: new Date(Date.now() - Math.random() * 6 * 60 * 60 * 1000)
    }
  ]

  for (const dashboard of dashboards) {
    await prisma.dashboard.create({
      data: dashboard
    })
  }

  // Create funnel analysis
  const funnels = [
    {
      name: 'Learning Journey Funnel',
      description: 'Track user progression through the learning journey',
      steps: [
        { name: 'Registration', order: 1 },
        { name: 'First Lesson', order: 2 },
        { name: 'First Quiz', order: 3 },
        { name: 'Course Completion', order: 4 },
        { name: 'Certification', order: 5 }
      ]
    },
    {
      name: 'Engagement Funnel',
      description: 'Track user engagement and retention',
      steps: [
        { name: 'Daily Active', order: 1 },
        { name: 'Weekly Return', order: 2 },
        { name: 'Monthly Active', order: 3 },
        { name: '3 Month Retention', order: 4 }
      ]
    }
  ]

  for (const funnel of funnels) {
    const createdFunnel = await prisma.funnel.create({
      data: {
        name: funnel.name,
        description: funnel.description
      }
    })

    for (const step of funnel.steps) {
      await prisma.funnelStep.create({
        data: {
          funnelId: createdFunnel.id,
          name: step.name,
          order: step.order,
          userCount: Math.floor(Math.random() * 1000 / step.order) + 100,
          conversionRate: Math.max(0.1, 1 - (step.order - 1) * 0.15), // Decreasing conversion
          avgTimeToNext: step.order < funnel.steps.length ? Math.floor(Math.random() * 86400) + 3600 : null, // 1-24 hours
          dropoffReasons: step.order > 1 ? {
            'too_difficult': Math.random() * 0.3,
            'not_engaged': Math.random() * 0.4,
            'technical_issues': Math.random() * 0.1,
            'other': Math.random() * 0.2
          } : null
        }
      })
    }
  }

  // Create cohort analysis
  const cohortPeriods = ['weekly', 'monthly', 'quarterly']
  for (const period of cohortPeriods) {
    const numCohorts = period === 'weekly' ? 12 : period === 'monthly' ? 6 : 4
    
    for (let i = 0; i < numCohorts; i++) {
      const cohortStart = new Date()
      const cohortEnd = new Date()
      
      if (period === 'weekly') {
        cohortStart.setDate(cohortStart.getDate() - i * 7)
        cohortEnd.setDate(cohortEnd.getDate() - (i - 1) * 7)
      } else if (period === 'monthly') {
        cohortStart.setMonth(cohortStart.getMonth() - i)
        cohortEnd.setMonth(cohortEnd.getMonth() - i + 1)
      } else {
        cohortStart.setMonth(cohortStart.getMonth() - i * 3)
        cohortEnd.setMonth(cohortEnd.getMonth() - (i - 1) * 3)
      }
      
      const cohortSize = Math.floor(Math.random() * 500) + 100
      const retentionData = {}
      
      // Generate retention rates for different periods
      for (let week = 1; week <= 12; week++) {
        const baseRetention = Math.max(0.1, 1 - (week * 0.08)) // Declining retention
        retentionData[`week_${week}`] = Math.max(0, baseRetention + (Math.random() - 0.5) * 0.2)
      }
      
      await prisma.cohortAnalysis.create({
        data: {
          cohortPeriod: period,
          cohortStart,
          cohortEnd,
          cohortSize,
          retentionData,
          avgLifetimeValue: Math.random() * 200 + 50,
          conversionRate: Math.random() * 0.4 + 0.1,
          churnRate: Math.random() * 0.3 + 0.05,
          segmentBreakdown: {
            'new_users': Math.random() * 0.6 + 0.2,
            'returning_users': Math.random() * 0.4 + 0.1,
            'premium_users': Math.random() * 0.2
          }
        }
      })
    }
  }

  // Create A/B test results
  const experiments = [
    'adaptive_difficulty_v2',
    'gamification_badges',
    'social_learning_features',
    'personalized_recommendations',
    'mobile_push_notifications'
  ]

  for (const experimentName of experiments) {
    const variants = ['control', 'variant_a', 'variant_b']
    
    for (const variant of variants) {
      const participants = Math.floor(Math.random() * 1000) + 200
      const conversions = Math.floor(participants * (Math.random() * 0.4 + 0.1)) // 10-50% conversion
      
      await prisma.abTestResult.create({
        data: {
          experimentName,
          variant,
          participants,
          conversions,
          conversionRate: conversions / participants,
          confidenceLevel: Math.random() * 0.3 + 0.7, // 70-100%
          pValue: Math.random() * 0.05, // 0-5%
          statisticalSignificance: Math.random() > 0.3, // 70% significant
          metrics: {
            engagement_rate: Math.random() * 0.5 + 0.3,
            session_duration: Math.floor(Math.random() * 1800) + 300, // 5-35 minutes
            completion_rate: Math.random() * 0.6 + 0.2,
            user_satisfaction: Math.random() * 2 + 3 // 3-5 rating
          },
          segmentResults: {
            'new_users': {
              conversion_rate: Math.random() * 0.3 + 0.1,
              sample_size: Math.floor(participants * 0.4)
            },
            'returning_users': {
              conversion_rate: Math.random() * 0.5 + 0.2,
              sample_size: Math.floor(participants * 0.6)
            }
          }
        }
      })
    }
  }

  console.log('Analytics service database seeding completed successfully!')
  console.log('\nSeed data created:')
  console.log(`- ${processingStatuses.length} processing status entries`)
  console.log(`- ${learningEvents.length} learning events`)
  console.log(`- ${metricNames.length * timeWindows.length * users.length * concepts.length * 10} metric aggregations`)
  console.log(`- ${users.length} user behavior profiles`)
  console.log(`- ${concepts.length * 3 * 30} concept analytics entries`) // 3 periods * avg 30 entries
  console.log(`- 20 alerts`)
  console.log(`- ${predictionModels.length} prediction models`)
  console.log(`- 50 predictions with validations`)
  console.log(`- ${dashboards.length} dashboards`)
  console.log(`- ${funnels.length} funnel analyses`)
  console.log(`- ${cohortPeriods.length * 12} cohort analyses`) // 3 periods * avg 12 cohorts
  console.log(`- ${experiments.length * 3} A/B test results`) // 5 experiments * 3 variants
}

function getWindowMilliseconds(window: string): number {
  switch (window) {
    case '1m': return 60 * 1000
    case '5m': return 5 * 60 * 1000
    case '1h': return 60 * 60 * 1000
    case '1d': return 24 * 60 * 60 * 1000
    default: return 60 * 60 * 1000
  }
}

function getBaseValueForMetric(metricName: string): number {
  switch (metricName) {
    case 'accuracy_rate': return 0.7
    case 'response_time': return 25000 // 25 seconds
    case 'engagement_score': return 0.6
    case 'session_count': return 5
    case 'completion_rate': return 0.8
    default: return 1
  }
}

function getMetricTypeForMetric(metricName: string): string {
  switch (metricName) {
    case 'accuracy_rate':
    case 'engagement_score': 
    case 'completion_rate': return 'GAUGE'
    case 'response_time': return 'HISTOGRAM'
    case 'session_count': return 'COUNTER'
    default: return 'GAUGE'
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })