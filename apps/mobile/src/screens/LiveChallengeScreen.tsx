import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert, FlatList, Animated } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRealTimeChallenges } from '../hooks/useRealTime'
import { ChallengeAnswer } from '../services/socketService'

interface QuestionProps {
  question: any
  onAnswer: (answer: string) => void
  timeRemaining: number
}

function QuestionComponent({ question, onAnswer, timeRemaining }: QuestionProps) {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [answered, setAnswered] = useState(false)

  const handleAnswer = (answer: string) => {
    if (answered) return

    setSelectedAnswer(answer)
    setAnswered(true)
    onAnswer(answer)
  }

  return (
    <View style={styles.questionContainer}>
      <View style={styles.questionHeader}>
        <Text style={styles.questionText}>{question.content}</Text>
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{Math.ceil(timeRemaining / 1000)}s</Text>
        </View>
      </View>

      <View style={styles.optionsContainer}>
        {question.options?.map((option: any) => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.optionButton,
              selectedAnswer === option.id && styles.selectedOption,
              answered && option.isCorrect && styles.correctOption,
              answered &&
                selectedAnswer === option.id &&
                !option.isCorrect &&
                styles.incorrectOption,
            ]}
            onPress={() => handleAnswer(option.id)}
            disabled={answered}
          >
            <Text
              style={[styles.optionText, selectedAnswer === option.id && styles.selectedOptionText]}
            >
              {option.text}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}

interface ScoreboardProps {
  participants: string[]
  scores: Record<string, number>
  currentUserId: string
}

function Scoreboard({ participants, scores, currentUserId }: ScoreboardProps) {
  const sortedParticipants = participants
    .map((id) => ({ id, score: scores[id] || 0 }))
    .sort((a, b) => b.score - a.score)

  return (
    <View style={styles.scoreboardContainer}>
      <Text style={styles.scoreboardTitle}>Live Scores</Text>
      <FlatList
        data={sortedParticipants}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <View style={[styles.scoreItem, item.id === currentUserId && styles.currentUserScore]}>
            <Text style={styles.scoreRank}>#{index + 1}</Text>
            <Text style={styles.scoreUser}>
              {item.id === currentUserId ? 'You' : `Player ${item.id.slice(-4)}`}
            </Text>
            <Text style={styles.scoreValue}>{item.score}</Text>
          </View>
        )}
      />
    </View>
  )
}

export default function LiveChallengeScreen({ route, navigation }: any) {
  const { challengeId } = route.params || {}
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now())

  const {
    currentChallenge,
    isInChallenge,
    challengeScore,
    challengePosition,
    join,
    leave,
    submitAnswer,
    getCurrentChallengeProgress,
  } = useRealTimeChallenges()

  useEffect(() => {
    if (challengeId && !isInChallenge) {
      handleJoinChallenge()
    }
  }, [challengeId, isInChallenge])

  useEffect(() => {
    if (currentChallenge && !startTime) {
      setStartTime(Date.now())
      setQuestionStartTime(Date.now())
    }
  }, [currentChallenge, startTime])

  const handleJoinChallenge = async () => {
    if (!challengeId) return

    const result = await join(challengeId)
    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to join challenge')
      navigation.goBack()
    }
  }

  const handleLeaveChallenge = async () => {
    Alert.alert('Leave Challenge', 'Are you sure you want to leave this challenge?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          if (currentChallenge) {
            await leave(currentChallenge.id)
          }
          navigation.goBack()
        },
      },
    ])
  }

  const handleAnswer = useCallback(
    async (selectedAnswer: string) => {
      if (!currentChallenge) return

      const responseTime = Date.now() - questionStartTime
      const currentQuestion = currentChallenge.questions[currentQuestionIndex]

      const answer: ChallengeAnswer = {
        challengeId: currentChallenge.id,
        questionId: currentQuestion.id,
        selectedAnswer,
        responseTime,
        timestamp: new Date().toISOString(),
      }

      const result = await submitAnswer(answer)
      if (!result.success) {
        Alert.alert('Error', 'Failed to submit answer')
        return
      }

      // Move to next question after a short delay
      setTimeout(() => {
        if (currentQuestionIndex < currentChallenge.questions.length - 1) {
          setCurrentQuestionIndex((prev) => prev + 1)
          setQuestionStartTime(Date.now())
        } else {
          // Challenge completed
          Alert.alert(
            'Challenge Complete!',
            `Final Score: ${challengeScore}\nPosition: #${challengePosition}`,
            [{ text: 'OK', onPress: () => navigation.goBack() }],
          )
        }
      }, 2000)
    },
    [
      currentChallenge,
      currentQuestionIndex,
      questionStartTime,
      challengeScore,
      challengePosition,
      submitAnswer,
      navigation,
    ],
  )

  if (!currentChallenge || !isInChallenge) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Joining challenge...</Text>
        </View>
      </SafeAreaView>
    )
  }

  const progress = getCurrentChallengeProgress()
  const currentQuestion = currentChallenge.questions[currentQuestionIndex]
  const timeRemaining = progress?.timeRemaining || 30000

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleLeaveChallenge} style={styles.leaveButton}>
          <Text style={styles.leaveButtonText}>Leave</Text>
        </TouchableOpacity>

        <View style={styles.challengeInfo}>
          <Text style={styles.challengeType}>
            {currentChallenge.type.replace('_', ' ').toUpperCase()}
          </Text>
          <Text style={styles.questionProgress}>
            {currentQuestionIndex + 1} / {currentChallenge.questions.length}
          </Text>
        </View>

        <View style={styles.scoreInfo}>
          <Text style={styles.scoreText}>Score: {challengeScore}</Text>
          <Text style={styles.positionText}>#{challengePosition}</Text>
        </View>
      </View>

      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${((currentQuestionIndex + 1) / currentChallenge.questions.length) * 100}%` },
          ]}
        />
      </View>

      <View style={styles.content}>
        {currentQuestion && (
          <QuestionComponent
            question={currentQuestion}
            onAnswer={handleAnswer}
            timeRemaining={timeRemaining}
          />
        )}

        <Scoreboard
          participants={currentChallenge.participants}
          scores={currentChallenge.scores}
          currentUserId="current-user" // This would come from auth store
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#8E8E93',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  leaveButton: {
    padding: 8,
  },
  leaveButtonText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '500',
  },
  challengeInfo: {
    alignItems: 'center',
  },
  challengeType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  questionProgress: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  scoreInfo: {
    alignItems: 'flex-end',
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  positionText: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E5EA',
    marginHorizontal: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  questionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  questionText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '500',
    color: '#1C1C1E',
    marginRight: 16,
  },
  timerContainer: {
    backgroundColor: '#FF3B30',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  timerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedOption: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  correctOption: {
    borderColor: '#34C759',
    backgroundColor: '#E8F5E8',
  },
  incorrectOption: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFEBEE',
  },
  optionText: {
    fontSize: 16,
    color: '#1C1C1E',
  },
  selectedOptionText: {
    fontWeight: '500',
  },
  scoreboardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  scoreboardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1C1C1E',
    marginBottom: 12,
  },
  scoreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  currentUserScore: {
    backgroundColor: '#E3F2FD',
  },
  scoreRank: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
    width: 40,
  },
  scoreUser: {
    flex: 1,
    fontSize: 16,
    color: '#1C1C1E',
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
})
