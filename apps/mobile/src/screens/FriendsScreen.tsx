import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRealTimeFriends, useRealTimeNotifications } from '../hooks/useRealTime'
import { useSocialStore } from '../store'

interface FriendItemProps {
  friend: any
  isOnline: boolean
  onChallenge: (friendId: string) => void
}

function FriendItem({ friend, isOnline, onChallenge }: FriendItemProps) {
  return (
    <View style={styles.friendItem}>
      <View style={styles.friendInfo}>
        <View style={styles.friendHeader}>
          <Text style={styles.friendName}>{friend.displayName || friend.email}</Text>
          <View
            style={[styles.onlineIndicator, { backgroundColor: isOnline ? '#34C759' : '#8E8E93' }]}
          />
        </View>
        <Text style={styles.friendStats}>
          Streak: {friend.currentStreak} days • XP: {friend.totalXP}
        </Text>
      </View>
      <TouchableOpacity style={styles.challengeButton} onPress={() => onChallenge(friend.id)}>
        <Text style={styles.challengeButtonText}>Challenge</Text>
      </TouchableOpacity>
    </View>
  )
}

interface ActivityItemProps {
  activity: any
}

function ActivityItem({ activity }: ActivityItemProps) {
  return (
    <View style={styles.activityItem}>
      <Text style={styles.activityFriend}>{activity.friendName}</Text>
      <Text style={styles.activityDescription}>{activity.description}</Text>
      <Text style={styles.activityTime}>{new Date(activity.timestamp).toLocaleTimeString()}</Text>
    </View>
  )
}

export default function FriendsScreen() {
  const [refreshing, setRefreshing] = useState(false)
  const { friends, loadFriends } = useSocialStore()
  const {
    friendActivities,
    onlineFriends,
    isFriendOnline,
    getRecentActivities,
    onlineFriendsCount,
  } = useRealTimeFriends()

  const { notifications } = useRealTimeNotifications()

  // Filter friend-related notifications
  const friendNotifications = notifications.filter(
    (n) => n.type === 'friend_request' || n.type === 'friend_challenge',
  )

  useEffect(() => {
    loadFriends()
  }, [loadFriends])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await loadFriends()
    } catch (error) {
      console.error('Failed to refresh friends:', error)
    } finally {
      setRefreshing(false)
    }
  }

  const handleChallengeFriend = async (friendId: string) => {
    Alert.alert('Challenge Friend', 'What type of challenge would you like to send?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Speed Quiz',
        onPress: () => createChallenge(friendId, 'speed_quiz'),
      },
      {
        text: 'Accuracy Challenge',
        onPress: () => createChallenge(friendId, 'accuracy_challenge'),
      },
    ])
  }

  const createChallenge = async (friendId: string, challengeType: string) => {
    try {
      // This would use the real-time challenge hook
      console.log(`Creating ${challengeType} challenge for friend ${friendId}`)
      Alert.alert('Challenge Sent!', 'Your friend will be notified of the challenge.')
    } catch (error) {
      Alert.alert('Error', 'Failed to send challenge. Please try again.')
    }
  }

  const recentActivities = getRecentActivities(5)

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Friends</Text>
        <View style={styles.onlineStatus}>
          <View style={styles.onlineIndicator} />
          <Text style={styles.onlineText}>{onlineFriendsCount} online</Text>
        </View>
      </View>

      {friendNotifications.length > 0 && (
        <View style={styles.notificationsSection}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          {friendNotifications.slice(0, 3).map((notification) => (
            <View key={notification.id} style={styles.notificationItem}>
              <Text style={styles.notificationTitle}>{notification.title}</Text>
              <Text style={styles.notificationMessage}>{notification.message}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Friends ({friends.length})</Text>
        <FlatList
          data={friends}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FriendItem
              friend={item}
              isOnline={isFriendOnline(item.id)}
              onChallenge={handleChallengeFriend}
            />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No friends yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Add friends to compete and learn together!
              </Text>
            </View>
          }
        />
      </View>

      {recentActivities.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <FlatList
            data={recentActivities}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <ActivityItem activity={item} />}
            style={styles.activityList}
          />
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
})
