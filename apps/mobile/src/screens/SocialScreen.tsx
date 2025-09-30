import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import {
  useRealTimeFriends,
  useRealTimeNotifications,
  useRealTimeChallenges,
} from '../hooks/useRealTime'
import { useSocialStore } from '../store'

interface FriendItemProps {
  friend: any
  isOnline: boolean
  onChallenge: (friendId: string) => void
  onViewProfile: (friendId: string) => void
}

function FriendItem({ friend, isOnline, onChallenge, onViewProfile }: FriendItemProps) {
  return (
    <View style={styles.friendItem}>
      <View style={styles.friendInfo}>
        <View
          style={[styles.onlineIndicator, { backgroundColor: isOnline ? '#34C759' : '#8E8E93' }]}
        />
        <View style={styles.friendDetails}>
          <Text style={styles.friendName}>{friend.displayName || friend.email}</Text>
          <Text style={styles.friendStatus}>
            {isOnline ? 'Online' : `Last seen ${friend.lastSeen || 'recently'}`}
          </Text>
        </View>
      </View>
      <View style={styles.friendActions}>
        <TouchableOpacity
          style={styles.challengeButton}
          onPress={() => onChallenge(friend.id)}
          disabled={!isOnline}
        >
          <Text style={[styles.challengeButtonText, !isOnline && styles.disabledText]}>
            Challenge
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.profileButton} onPress={() => onViewProfile(friend.id)}>
          <Text style={styles.profileButtonText}>View</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

interface ActivityItemProps {
  activity: any
}

function ActivityItem({ activity }: ActivityItemProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'session_completed':
        return '📚'
      case 'achievement_unlocked':
        return '🏆'
      case 'streak_milestone':
        return '🔥'
      case 'challenge_completed':
        return '⚡'
      default:
        return '📱'
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return `${Math.floor(diffMins / 1440)}d ago`
  }

  return (
    <View style={styles.activityItem}>
      <Text style={styles.activityIcon}>{getActivityIcon(activity.type)}</Text>
      <View style={styles.activityContent}>
        <Text style={styles.activityText}>
          <Text style={styles.friendName}>{activity.friendName}</Text> {activity.description}
        </Text>
        <Text style={styles.activityTime}>{formatTime(activity.timestamp)}</Text>
      </View>
    </View>
  )
}

export default function SocialScreen({ navigation }: any) {
  const [refreshing, setRefreshing] = useState(false)
  const [selectedTab, setSelectedTab] = useState<'friends' | 'activity'>('friends')

  const { friends } = useSocialStore()
  const { friendActivities, onlineFriends, isFriendOnline, getRecentActivities } =
    useRealTimeFriends()
  const { notifications, getNotificationsByType } = useRealTimeNotifications()
  const { createChallenge } = useRealTimeChallenges()

  const friendRequests = getNotificationsByType('friend_request').filter(
    (n) => n.actionRequired && !n.isRead,
  )
  const recentActivities = getRecentActivities(20)

  const onRefresh = async () => {
    setRefreshing(true)
    // In a real app, this would sync friend data from server
    setTimeout(() => setRefreshing(false), 1000)
  }

  const handleChallengeFriend = async (friendId: string) => {
    Alert.alert('Challenge Friend', 'What type of challenge would you like to send?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Speed Quiz',
        onPress: async () => {
          const result = await createChallenge(friendId, 'speed_quiz')
          if (result.success) {
            Alert.alert('Success', 'Challenge sent!')
          } else {
            Alert.alert('Error', result.error || 'Failed to send challenge')
          }
        },
      },
      {
        text: 'Knowledge Duel',
        onPress: async () => {
          const result = await createChallenge(friendId, 'knowledge_duel')
          if (result.success) {
            Alert.alert('Success', 'Challenge sent!')
          } else {
            Alert.alert('Error', result.error || 'Failed to send challenge')
          }
        },
      },
    ])
  }

  const handleViewProfile = (friendId: string) => {
    navigation.navigate('Profile', { userId: friendId })
  }

  const handleAcceptFriendRequest = (notification: any) => {
    // In a real app, this would call the friend service
    Alert.alert('Friend Request', `Accept friend request from ${notification.data.email}?`, [
      { text: 'Decline', style: 'cancel' },
      { text: 'Accept', onPress: () => console.log('Accepted friend request') },
    ])
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Social</Text>
        <TouchableOpacity
          style={styles.addFriendButton}
          onPress={() => navigation.navigate('Friends')}
        >
          <Text style={styles.addFriendButtonText}>+ Add Friend</Text>
        </TouchableOpacity>
      </View>

      {friendRequests.length > 0 && (
        <View style={styles.friendRequestsContainer}>
          <Text style={styles.sectionTitle}>Friend Requests ({friendRequests.length})</Text>
          {friendRequests.slice(0, 3).map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={styles.friendRequestItem}
              onPress={() => handleAcceptFriendRequest(notification)}
            >
              <Text style={styles.friendRequestText}>{notification.message}</Text>
              <Text style={styles.friendRequestAction}>Tap to respond</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'friends' && styles.activeTab]}
          onPress={() => setSelectedTab('friends')}
        >
          <Text style={[styles.tabText, selectedTab === 'friends' && styles.activeTabText]}>
            Friends ({friends.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'activity' && styles.activeTab]}
          onPress={() => setSelectedTab('activity')}
        >
          <Text style={[styles.tabText, selectedTab === 'activity' && styles.activeTabText]}>
            Activity
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {selectedTab === 'friends' ? (
          <View style={styles.friendsContainer}>
            <View style={styles.onlineStatus}>
              <Text style={styles.onlineStatusText}>
                {onlineFriends.length} of {friends.length} friends online
              </Text>
            </View>

            {friends.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>No Friends Yet</Text>
                <Text style={styles.emptyStateText}>
                  Add friends to compete in challenges and share your progress!
                </Text>
                <TouchableOpacity
                  style={styles.addFirstFriendButton}
                  onPress={() => navigation.navigate('Friends')}
                >
                  <Text style={styles.addFirstFriendButtonText}>Find Friends</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={friends}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <FriendItem
                    friend={item}
                    isOnline={isFriendOnline(item.id)}
                    onChallenge={handleChallengeFriend}
                    onViewProfile={handleViewProfile}
                  />
                )}
                scrollEnabled={false}
              />
            )}
          </View>
        ) : (
          <View style={styles.activityContainer}>
            {recentActivities.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>No Recent Activity</Text>
                <Text style={styles.emptyStateText}>
                  Friend activities will appear here when they complete sessions or unlock
                  achievements.
                </Text>
              </View>
            ) : (
              <FlatList
                data={recentActivities}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <ActivityItem activity={item} />}
                scrollEnabled={false}
              />
            )}
          </View>
        )}
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
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1C1C1E',
    marginBottom: 20,
  },
  placeholder: {
    backgroundColor: '#FFFFFF',
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
})
