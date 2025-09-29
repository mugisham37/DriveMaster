import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const CATEGORIES_DATA = [
  {
    key: 'traffic_signs',
    name: 'Traffic Signs',
    description: 'Understanding various traffic signs and their meanings',
    icon: '🚦',
    color: '#FF6B35',
    order: 1
  },
  {
    key: 'road_rules',
    name: 'Road Rules & Laws',
    description: 'Traffic laws, right-of-way rules, and legal requirements',
    icon: '⚖️',
    color: '#4ECDC4',
    order: 2
  },
  {
    key: 'safety_procedures',
    name: 'Safety Procedures',
    description: 'Safe driving practices and emergency procedures',
    icon: '🛡️',
    color: '#45B7D1',
    order: 3
  },
  {
    key: 'vehicle_operations',
    name: 'Vehicle Operations',
    description: 'Vehicle controls, maintenance, and basic mechanics',
    icon: '🚗',
    color: '#96CEB4',
    order: 4
  },
  {
    key: 'situational_judgment',
    name: 'Situational Judgment',
    description: 'Decision-making in various driving scenarios',
    icon: '🤔',
    color: '#FECA57',
    order: 5
  }
]

const CONCEPTS_DATA = [
  // Traffic Signs Concepts
  {
    key: 'regulatory_signs',
    name: 'Regulatory Signs',
    description: 'Signs that inform drivers of traffic laws and regulations',
    categoryKey: 'traffic_signs',
    learningGoals: ['Identify regulatory signs', 'Understand legal requirements', 'Apply rules correctly'],
    difficulty: 0.3,
    estimatedTime: 15,
    order: 1,
    tags: ['signs', 'regulations', 'laws']
  },
  {
    key: 'warning_signs',
    name: 'Warning Signs',
    description: 'Signs that alert drivers to potential hazards ahead',
    categoryKey: 'traffic_signs',
    learningGoals: ['Recognize warning signs', 'Anticipate hazards', 'Adjust driving behavior'],
    difficulty: 0.4,
    estimatedTime: 20,
    order: 2,
    tags: ['signs', 'warnings', 'hazards']
  },
  {
    key: 'guide_signs',
    name: 'Guide Signs',
    description: 'Signs that provide directional and distance information',
    categoryKey: 'traffic_signs',
    learningGoals: ['Read guide signs', 'Navigate effectively', 'Plan routes'],
    difficulty: 0.2,
    estimatedTime: 10,
    order: 3,
    tags: ['signs', 'navigation', 'directions']
  },
  
  // Road Rules Concepts
  {
    key: 'right_of_way',
    name: 'Right of Way',
    description: 'Rules determining which driver has the right to proceed first',
    categoryKey: 'road_rules',
    learningGoals: ['Understand precedence rules', 'Apply at intersections', 'Resolve conflicts safely'],
    difficulty: 0.6,
    estimatedTime: 25,
    order: 1,
    tags: ['rules', 'intersections', 'precedence']
  },
  {
    key: 'speed_limits',
    name: 'Speed Limits',
    description: 'Understanding speed regulations in different zones',
    categoryKey: 'road_rules',
    learningGoals: ['Know speed limits', 'Adjust to conditions', 'Recognize zones'],
    difficulty: 0.3,
    estimatedTime: 15,
    order: 2,
    tags: ['speed', 'limits', 'zones']
  },
  
  // Safety Procedures Concepts
  {
    key: 'defensive_driving',
    name: 'Defensive Driving',
    description: 'Proactive techniques to avoid accidents and hazards',
    categoryKey: 'safety_procedures',
    learningGoals: ['Anticipate dangers', 'Maintain safe distances', 'Stay alert'],
    difficulty: 0.5,
    estimatedTime: 30,
    order: 1,
    tags: ['safety', 'defensive', 'prevention']
  },
  {
    key: 'emergency_procedures',
    name: 'Emergency Procedures',
    description: 'How to handle accidents, breakdowns, and emergencies',
    categoryKey: 'safety_procedures',
    learningGoals: ['Respond to emergencies', 'Use safety equipment', 'Get help'],
    difficulty: 0.7,
    estimatedTime: 20,
    order: 2,
    tags: ['emergency', 'accidents', 'breakdowns']
  }
]

const ITEMS_DATA = [
  // Regulatory Signs Items
  {
    title: 'Stop Sign Recognition',
    body: 'What should you do when you encounter this traffic sign?',
    explanation: 'A stop sign requires you to come to a complete stop, yield to traffic and pedestrians, then proceed when safe.',
    conceptKey: 'regulatory_signs',
    type: 'MULTIPLE_CHOICE',
    difficulty: 0.2,
    difficultyLevel: 'BEGINNER',
    estimatedTime: 30,
    options: {
      a: 'Slow down and proceed with caution',
      b: 'Come to a complete stop',
      c: 'Yield to oncoming traffic only',
      d: 'Stop only if other vehicles are present'
    },
    correctAnswer: { answer: 'b', explanation: 'Stop signs require a complete stop regardless of traffic conditions' },
    points: 1,
    hints: ['Look for the octagonal shape', 'Remember: STOP means complete stop'],
    feedback: {
      correct: 'Excellent! You correctly identified that stop signs require a complete stop.',
      incorrect: 'Remember that stop signs always require a complete stop, even when no other traffic is visible.'
    },
    tags: ['stop', 'regulatory', 'intersection'],
    keywords: ['stop sign', 'complete stop', 'intersection safety']
  },
  {
    title: 'Speed Limit Sign Understanding',
    body: 'You see a sign that says "SPEED LIMIT 25". What does this mean?',
    explanation: 'Speed limit signs indicate the maximum legal speed under normal conditions.',
    conceptKey: 'regulatory_signs',
    type: 'MULTIPLE_CHOICE',
    difficulty: 0.1,
    difficultyLevel: 'BEGINNER',
    estimatedTime: 25,
    options: {
      a: 'You must drive exactly 25 mph',
      b: 'The maximum speed allowed is 25 mph',
      c: 'The minimum speed required is 25 mph',
      d: '25 mph is only a suggestion'
    },
    correctAnswer: { answer: 'b', explanation: 'Speed limit signs show the maximum legal speed allowed' },
    points: 1,
    hints: ['Speed limit means maximum', 'You can drive slower if conditions require'],
    feedback: {
      correct: 'Correct! Speed limits show the maximum legal speed under normal conditions.',
      incorrect: 'Speed limit signs indicate the maximum speed allowed, not a required or suggested speed.'
    },
    tags: ['speed', 'limit', 'maximum'],
    keywords: ['speed limit', 'maximum speed', 'legal limit']
  },
  
  // Warning Signs Items
  {
    title: 'Curve Warning Sign',
    body: 'You see a yellow diamond-shaped sign with a curved arrow. What should you do?',
    explanation: 'Curve warning signs alert drivers to reduce speed before entering a curve.',
    conceptKey: 'warning_signs',
    type: 'MULTIPLE_CHOICE',
    difficulty: 0.3,
    difficultyLevel: 'INTERMEDIATE',
    estimatedTime: 35,
    options: {
      a: 'Maintain current speed',
      b: 'Reduce speed before the curve',
      c: 'Stop and check for oncoming traffic',
      d: 'Increase speed to navigate quickly'
    },
    correctAnswer: { answer: 'b', explanation: 'Reduce speed before entering curves to maintain control' },
    points: 1,
    hints: ['Yellow signs warn of hazards', 'Curves require reduced speed'],
    feedback: {
      correct: 'Well done! You should reduce speed before entering curves for safety.',
      incorrect: 'Warning signs alert you to hazards ahead. Reduce speed before curves to maintain vehicle control.'
    },
    tags: ['curve', 'warning', 'speed reduction'],
    keywords: ['curve warning', 'reduce speed', 'vehicle control']
  },
  
  // Right of Way Items
  {
    title: 'Four-Way Stop Intersection',
    body: 'You arrive at a four-way stop intersection at the same time as another vehicle to your right. Who has the right of way?',
    explanation: 'At four-way stops, the vehicle on the right has the right of way when vehicles arrive simultaneously.',
    conceptKey: 'right_of_way',
    type: 'MULTIPLE_CHOICE',
    difficulty: 0.6,
    difficultyLevel: 'INTERMEDIATE',
    estimatedTime: 40,
    options: {
      a: 'You have the right of way',
      b: 'The vehicle to your right has the right of way',
      c: 'The larger vehicle has the right of way',
      d: 'Whoever arrived first has the right of way'
    },
    correctAnswer: { answer: 'b', explanation: 'Vehicle to the right has right of way in simultaneous arrivals' },
    points: 2,
    hints: ['Remember the "right has right of way" rule', 'This applies when arrival times are simultaneous'],
    feedback: {
      correct: 'Excellent! The vehicle to your right has the right of way at four-way stops.',
      incorrect: 'At four-way stops, when vehicles arrive simultaneously, the vehicle to your right has the right of way.'
    },
    tags: ['right of way', 'intersection', 'four-way stop'],
    keywords: ['four-way stop', 'simultaneous arrival', 'right has right of way']
  },
  
  // Defensive Driving Items
  {
    title: 'Following Distance',
    body: 'What is the recommended following distance behind another vehicle in normal conditions?',
    explanation: 'The 3-second rule provides adequate stopping distance in normal driving conditions.',
    conceptKey: 'defensive_driving',
    type: 'MULTIPLE_CHOICE',
    difficulty: 0.4,
    difficultyLevel: 'INTERMEDIATE',
    estimatedTime: 30,
    options: {
      a: '1 second',
      b: '2 seconds',
      c: '3 seconds',
      d: '5 seconds'
    },
    correctAnswer: { answer: 'c', explanation: 'The 3-second rule allows adequate reaction and stopping time' },
    points: 1,
    hints: ['Count "one thousand one" to measure seconds', 'More distance is needed in poor conditions'],
    feedback: {
      correct: 'Perfect! The 3-second rule provides safe following distance in normal conditions.',
      incorrect: 'The 3-second rule is recommended for normal conditions, providing adequate reaction time.'
    },
    tags: ['following distance', '3-second rule', 'safety'],
    keywords: ['following distance', 'three second rule', 'safe driving distance']
  },
  
  // Scenario-based items
  {
    title: 'Wet Road Driving Scenario',
    body: 'You are driving on a wet road and notice your vehicle starting to skid. What is the best course of action?',
    explanation: 'In a skid, ease off the accelerator and steer in the direction you want to go, avoiding sudden movements.',
    conceptKey: 'defensive_driving',
    type: 'SCENARIO',
    difficulty: 0.7,
    difficultyLevel: 'ADVANCED',
    estimatedTime: 45,
    options: {
      a: 'Brake hard and steer opposite to the skid',
      b: 'Accelerate to regain control',
      c: 'Ease off the accelerator and steer in the direction you want to go',
      d: 'Turn the steering wheel rapidly back and forth'
    },
    correctAnswer: { answer: 'c', explanation: 'Gentle steering and easing off acceleration helps regain traction' },
    points: 3,
    hints: ['Avoid sudden movements', 'Steer where you want to go', 'Don\'t overcorrect'],
    feedback: {
      correct: 'Excellent judgment! Smooth steering and reducing acceleration helps regain control.',
      incorrect: 'In a skid, avoid sudden movements. Ease off the accelerator and steer smoothly in your intended direction.'
    },
    tags: ['skid', 'wet roads', 'emergency'],
    keywords: ['vehicle skid', 'wet road conditions', 'skid recovery']
  }
]

async function seedContent() {
  console.log('🌱 Starting content seeding...')
  
  try {
    // Clear existing data
    console.log('🧹 Clearing existing data...')
    await prisma.item.deleteMany()
    await prisma.conceptPrerequisite.deleteMany()
    await prisma.concept.deleteMany()
    await prisma.category.deleteMany()
    
    // Create categories
    console.log('📁 Creating categories...')
    const categories = new Map<string, string>()
    
    for (const categoryData of CATEGORIES_DATA) {
      const category = await prisma.category.create({
        data: {
          key: categoryData.key,
          name: categoryData.name,
          description: categoryData.description,
          icon: categoryData.icon,
          color: categoryData.color,
          order: categoryData.order,
          isActive: true,
          metadata: {}
        }
      })
      categories.set(categoryData.key, category.id)
      console.log(`  ✅ Created category: ${category.name}`)
    }
    
    // Create concepts
    console.log('💡 Creating concepts...')
    const concepts = new Map<string, string>()
    
    for (const conceptData of CONCEPTS_DATA) {
      const categoryId = categories.get(conceptData.categoryKey)
      if (!categoryId) {
        console.error(`❌ Category not found: ${conceptData.categoryKey}`)
        continue
      }
      
      const concept = await prisma.concept.create({
        data: {
          key: conceptData.key,
          name: conceptData.name,
          description: conceptData.description,
          categoryId,
          learningGoals: conceptData.learningGoals,
          difficulty: conceptData.difficulty,
          estimatedTime: conceptData.estimatedTime,
          order: conceptData.order,
          status: 'PUBLISHED',
          isActive: true,
          tags: conceptData.tags,
          metadata: {}
        }
      })
      concepts.set(conceptData.key, concept.id)
      console.log(`  ✅ Created concept: ${concept.name}`)
    }
    
    // Create concept prerequisites
    console.log('🔗 Setting up concept dependencies...')
    const dependencies = [
      { concept: 'right_of_way', prerequisite: 'regulatory_signs', weight: 0.8 },
      { concept: 'emergency_procedures', prerequisite: 'defensive_driving', weight: 0.6 },
      { concept: 'defensive_driving', prerequisite: 'speed_limits', weight: 0.4 }
    ]
    
    for (const dep of dependencies) {
      const conceptId = concepts.get(dep.concept)
      const prerequisiteId = concepts.get(dep.prerequisite)
      
      if (conceptId && prerequisiteId) {
        await prisma.conceptPrerequisite.create({
          data: {
            conceptId,
            prerequisiteId,
            weight: dep.weight,
            isRequired: true
          }
        })
        console.log(`  ✅ Created dependency: ${dep.concept} depends on ${dep.prerequisite}`)
      }
    }
    
    // Create items
    console.log('📝 Creating content items...')
    let itemCount = 0
    
    for (const itemData of ITEMS_DATA) {
      const conceptId = concepts.get(itemData.conceptKey)
      if (!conceptId) {
        console.error(`❌ Concept not found: ${itemData.conceptKey}`)
        continue
      }
      
      // Generate slug
      const baseSlug = itemData.title.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      
      const item = await prisma.item.create({
        data: {
          slug: `${baseSlug}-${Date.now()}`,
          title: itemData.title,
          body: itemData.body,
          explanation: itemData.explanation,
          conceptId,
          type: itemData.type as any,
          difficulty: itemData.difficulty,
          difficultyLevel: itemData.difficultyLevel as any,
          estimatedTime: itemData.estimatedTime,
          options: itemData.options,
          correctAnswer: itemData.correctAnswer,
          points: itemData.points,
          hints: itemData.hints,
          feedback: itemData.feedback,
          status: 'PUBLISHED',
          isActive: true,
          publishedAt: new Date(),
          tags: itemData.tags,
          keywords: itemData.keywords,
          metadata: {},
          // IRT parameters with realistic values
          discrimination: 1.0 + Math.random() * 1.0, // 1.0 - 2.0
          difficultyIRT: (itemData.difficulty - 0.5) * 2, // Convert 0-1 to -1 to 1
          guessing: 0.15 + Math.random() * 0.1 // 0.15 - 0.25
        }
      })
      
      itemCount++
      console.log(`  ✅ Created item: ${item.title}`)
    }
    
    // Update concept statistics
    console.log('📊 Updating concept statistics...')
    for (const [conceptKey, conceptId] of concepts) {
      const itemCount = await prisma.item.count({
        where: { conceptId, isActive: true }
      })
      
      const avgDifficulty = await prisma.item.aggregate({
        where: { conceptId, isActive: true },
        _avg: { difficulty: true }
      })
      
      await prisma.concept.update({
        where: { id: conceptId },
        data: {
          totalItems: itemCount,
          avgDifficulty: avgDifficulty._avg.difficulty || 0.5,
          avgEngagement: 0.5 + Math.random() * 0.3, // Random engagement score
          successRate: 0.6 + Math.random() * 0.3 // Random success rate
        }
      })
    }
    
    console.log('🎉 Content seeding completed successfully!')
    console.log(`📈 Summary:`)
    console.log(`   - Categories: ${categories.size}`)
    console.log(`   - Concepts: ${concepts.size}`)
    console.log(`   - Items: ${itemCount}`)
    console.log(`   - Dependencies: ${dependencies.length}`)
    
  } catch (error) {
    console.error('❌ Error seeding content:', error)
    throw error
  }
}

seedContent()
  .catch((error) => {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })