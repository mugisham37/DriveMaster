"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth-context";
import { analyticsApi } from "@/lib/api/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  TrophyIcon,
  FireIcon,
  ChartBarIcon,
  UsersIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import {
  TrophyIcon as TrophySolidIcon,
  FireIcon as FireSolidIcon,
} from "@heroicons/react/24/solid";

interface LeaderboardEntry {
  userId: string;
  username: string;
  avatar?: string;
  score: number;
  rank: number;
  streak: number;
  accuracy: number;
  questionsAnswered: number;
  isCurrentUser?: boolean;
}

interface SocialLeaderboardProps {
  timeframe?: "week" | "month" | "all_time";
  category?: "accuracy" | "streak" | "questions" | "overall";
}

export function SocialLeaderboard({
  timeframe = "week",
  category = "overall",
}: SocialLeaderboardProps) {
  const { user } = useAuth();
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe);
  const [selectedCategory, setSelectedCategory] = useState(category);

  // Fetch leaderboard data
  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ["leaderboard", selectedTimeframe, selectedCategory],
    queryFn: () =>
      analyticsApi.getLeaderboard({
        timeframe: selectedTimeframe,
        category: selectedCategory,
        limit: 50,
      }),
  });

  // Fetch user's rank if not in top 50
  const { data: userRank } = useQuery({
    queryKey: ["userRank", user?.id, selectedTimeframe, selectedCategory],
    queryFn: () =>
      user
        ? analyticsApi.getUserRank(user.id, {
            timeframe: selectedTimeframe,
            category: selectedCategory,
          })
        : null,
    enabled: !!user,
  });

  const timeframes = [
    { value: "week", label: "This Week" },
    { value: "month", label: "This Month" },
    { value: "all_time", label: "All Time" },
  ] as const;

  const categories = [
    { value: "overall", label: "Overall Score", icon: TrophyIcon },
    { value: "accuracy", label: "Accuracy", icon: StarIcon },
    { value: "streak", label: "Study Streak", icon: FireIcon },
    { value: "questions", label: "Questions", icon: ChartBarIcon },
  ] as const;

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <TrophySolidIcon className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <TrophySolidIcon className="w-6 h-6 text-gray-400" />;
      case 3:
        return <TrophySolidIcon className="w-6 h-6 text-amber-600" />;
      default:
        return (
          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600">
            {rank}
          </div>
        );
    }
  };

  const getCategoryValue = (entry: LeaderboardEntry) => {
    switch (selectedCategory) {
      case "accuracy":
        return `${entry.accuracy.toFixed(1)}%`;
      case "streak":
        return `${entry.streak} days`;
      case "questions":
        return entry.questionsAnswered.toLocaleString();
      default:
        return entry.score.toLocaleString();
    }
  };

  const getCategoryIcon = () => {
    const categoryConfig = categories.find((c) => c.value === selectedCategory);
    const Icon = categoryConfig?.icon || TrophyIcon;
    return <Icon className="w-5 h-5" />;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="w-5 h-5" />
            Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-16"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UsersIcon className="w-5 h-5" />
          Leaderboard
        </CardTitle>

        {/* Timeframe Selection */}
        <div className="flex flex-wrap gap-2">
          {timeframes.map((tf) => (
            <Button
              key={tf.value}
              variant={selectedTimeframe === tf.value ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTimeframe(tf.value)}
            >
              {tf.label}
            </Button>
          ))}
        </div>

        {/* Category Selection */}
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <Button
                key={cat.value}
                variant={selectedCategory === cat.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat.value)}
                className="flex items-center gap-1"
              >
                <Icon className="w-4 h-4" />
                {cat.label}
              </Button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {leaderboard?.entries?.map((entry: LeaderboardEntry) => (
            <div
              key={entry.userId}
              className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                entry.isCurrentUser
                  ? "bg-blue-50 border border-blue-200"
                  : "hover:bg-gray-50"
              }`}
            >
              {/* Rank */}
              <div className="flex-shrink-0">{getRankIcon(entry.rank)}</div>

              {/* Avatar */}
              <Avatar className="w-8 h-8">
                <AvatarImage src={entry.avatar} alt={entry.username} />
                <AvatarFallback>
                  {entry.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">
                    {entry.username}
                    {entry.isCurrentUser && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        You
                      </Badge>
                    )}
                  </p>
                  {entry.streak > 7 && (
                    <FireSolidIcon className="w-4 h-4 text-orange-500" />
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{entry.accuracy.toFixed(1)}% accuracy</span>
                  <span>{entry.questionsAnswered} questions</span>
                  {entry.streak > 0 && (
                    <span className="flex items-center gap-1">
                      <FireIcon className="w-3 h-3" />
                      {entry.streak} day streak
                    </span>
                  )}
                </div>
              </div>

              {/* Score */}
              <div className="flex items-center gap-2 text-right">
                {getCategoryIcon()}
                <span className="font-semibold text-sm">
                  {getCategoryValue(entry)}
                </span>
              </div>
            </div>
          ))}

          {/* User's rank if not in top entries */}
          {userRank && userRank.rank > 50 && (
            <>
              <div className="border-t pt-3 mt-4">
                <p className="text-sm text-gray-500 text-center mb-3">
                  Your ranking
                </p>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <div className="flex-shrink-0">
                    {getRankIcon(userRank.rank)}
                  </div>
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user?.avatar} alt={user?.email} />
                    <AvatarFallback>
                      {user?.email?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {user?.email?.split("@")[0]}
                      <Badge variant="secondary" className="ml-2 text-xs">
                        You
                      </Badge>
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{userRank.accuracy.toFixed(1)}% accuracy</span>
                      <span>{userRank.questionsAnswered} questions</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getCategoryIcon()}
                    <span className="font-semibold text-sm">
                      {getCategoryValue(userRank)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {(!leaderboard?.entries || leaderboard.entries.length === 0) && (
            <div className="text-center py-8">
              <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No leaderboard data available</p>
              <p className="text-sm text-gray-400">
                Start practicing to see rankings!
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
