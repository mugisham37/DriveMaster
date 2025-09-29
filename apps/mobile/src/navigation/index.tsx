import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import * as Linking from 'expo-linking'
import { useAuthStore } from '../store'
import { RootStackParamList, MainTabParamList } from '../types'

// Import screens (we'll create these next)
import AuthScreen from '../screens/AuthScreen'
import LearnScreen from '../screens/LearnScreen'
import ProgressScreen from '../screens/ProgressScreen'
import SocialScreen from '../screens/SocialScreen'
import ProfileScreen from '../screens/ProfileScreen'
import QuestionScreen from '../screens/QuestionScreen'
import ResultsScreen from '../screens/ResultsScreen'
import SettingsScreen from '../screens/SettingsScreen'
import FriendsScreen from '../screens/FriendsScreen'
import LeaderboardScreen from '../screens/LeaderboardScreen'

const RootStack = createNativeStackNavigator<RootStackParamList>()
const MainTab = createBottomTabNavigator<MainTabParamList>()

// Deep linking configuration
const linking = {
  prefixes: [Linking.createURL('/')],
  config: {
    screens: {
      Auth: 'auth',
      Main: {
        screens: {
          Learn: 'learn',
          Progress: 'progress',
          Social: 'social',
          Profile: 'profile',
        },
      },
      Question: 'question/:questionId',
      Results: 'results/:sessionId',
      Settings: 'settings',
      Friends: 'friends',
      Leaderboard: 'leaderboard',
    },
  },
}

function MainTabNavigator() {
  return (
    <MainTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E5EA',
        },
      }}
    >
      <MainTab.Screen
        name="Learn"
        component={LearnScreen}
        options={{
          tabBarLabel: 'Learn',
          tabBarIcon: ({ color, size }) => (
            // In a real app, you'd use an icon library like react-native-vector-icons
            <TabIcon name="book" color={color} size={size} />
          ),
        }}
      />
      <MainTab.Screen
        name="Progress"
        component={ProgressScreen}
        options={{
          tabBarLabel: 'Progress',
          tabBarIcon: ({ color, size }) => <TabIcon name="chart" color={color} size={size} />,
        }}
      />
      <MainTab.Screen
        name="Social"
        component={SocialScreen}
        options={{
          tabBarLabel: 'Social',
          tabBarIcon: ({ color, size }) => <TabIcon name="users" color={color} size={size} />,
        }}
      />
      <MainTab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => <TabIcon name="user" color={color} size={size} />,
        }}
      />
    </MainTab.Navigator>
  )
}

// Simple tab icon component (replace with proper icons in production)
function TabIcon({ name, color, size }: { name: string; color: string; size: number }) {
  const iconMap: { [key: string]: string } = {
    book: '📚',
    chart: '📊',
    users: '👥',
    user: '👤',
  }

  return (
    <div
      style={{
        fontSize: size,
        color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {iconMap[name] || '?'}
    </div>
  )
}

export default function Navigation() {
  const { isAuthenticated } = useAuthStore()

  return (
    <NavigationContainer linking={linking}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <RootStack.Screen name="Auth" component={AuthScreen} />
        ) : (
          <>
            <RootStack.Screen name="Main" component={MainTabNavigator} />
            <RootStack.Screen
              name="Question"
              component={QuestionScreen}
              options={{
                headerShown: true,
                title: 'Question',
                presentation: 'modal',
              }}
            />
            <RootStack.Screen
              name="Results"
              component={ResultsScreen}
              options={{
                headerShown: true,
                title: 'Results',
                presentation: 'modal',
              }}
            />
            <RootStack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{
                headerShown: true,
                title: 'Settings',
              }}
            />
            <RootStack.Screen
              name="Friends"
              component={FriendsScreen}
              options={{
                headerShown: true,
                title: 'Friends',
              }}
            />
            <RootStack.Screen
              name="Leaderboard"
              component={LeaderboardScreen}
              options={{
                headerShown: true,
                title: 'Leaderboard',
              }}
            />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  )
}
