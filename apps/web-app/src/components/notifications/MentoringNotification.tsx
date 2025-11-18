"use client";

import React, { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { 
  MessageCircle, 
  Send, 
  CheckCheck,
  Clock,
  Verified
} from "lucide-react";

export interface MentoringNotificationProps {
  notification: {
    mentorName: string;
    mentorAvatar: string;
    messagePreview: string;
    conversationId: string;
    unread: boolean;
    timestamp: Date;
    isOnline?: boolean;
    isVerified?: boolean;
    responseTime?: string;
    relationshipDuration?: string;
    conversationContext?: {
      topic: string;
      originalQuestion?: string;
    };
  };
  onReply?: (message: string) => void;
  onView?: () => void;
  className?: string;
}

const quickReplies = [
  "Thank you!",
  "I'll try that",
  "Can you explain more?",
  "That makes sense",
];

export function MentoringNotification({
  notification,
  onReply,
  onView,
  className = "",
}: MentoringNotificationProps) {
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyMessage, setReplyMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleQuickReply = (message: string) => {
    onReply?.(message);
    setShowReplyBox(false);
  };

  const handleSendReply = () => {
    if (replyMessage.trim()) {
      onReply?.(replyMessage);
      setReplyMessage("");
      setShowReplyBox(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className={`w-full max-w-md border-purple-200 dark:border-purple-800 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {/* Mentor Avatar with Online Status */}
          <div className="relative">
            <Avatar className="w-12 h-12">
              <AvatarImage src={notification.mentorAvatar} alt={notification.mentorName} />
              <AvatarFallback>{getInitials(notification.mentorName)}</AvatarFallback>
            </Avatar>
            {notification.isOnline && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
            )}
          </div>

          {/* Mentor Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{notification.mentorName}</h3>
              {notification.isVerified && (
                <Verified className="w-4 h-4 text-blue-500 fill-blue-500" />
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                Mentor
              </Badge>
              {notification.unread && (
                <Badge variant="default" className="text-xs bg-purple-500">
                  New
                </Badge>
              )}
            </div>
          </div>

          {/* Timestamp */}
          <span className="text-xs text-muted-foreground">
            {formatTimestamp(notification.timestamp)}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Conversation Context */}
        {notification.conversationContext && (
          <div className="p-3 bg-purple-50 dark:bg-purple-950 rounded-lg space-y-1">
            <p className="text-xs font-medium text-purple-900 dark:text-purple-100">
              Re: {notification.conversationContext.topic}
            </p>
            {notification.conversationContext.originalQuestion && (
              <p className="text-xs text-purple-700 dark:text-purple-300 line-clamp-2">
                "{notification.conversationContext.originalQuestion}"
              </p>
            )}
          </div>
        )}

        {/* Message Preview */}
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <MessageCircle className="w-4 h-4 text-purple-500 mt-1 flex-shrink-0" />
            <p className="text-sm leading-relaxed">
              {notification.messagePreview}
            </p>
          </div>
          {notification.unread && (
            <div className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400">
              <CheckCheck className="w-3 h-3" />
              <span>Unread message</span>
            </div>
          )}
        </div>

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>{notification.mentorName} is typing...</span>
          </div>
        )}

        {/* Mentor Metadata */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {notification.responseTime && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Typically responds within {notification.responseTime}</span>
            </div>
          )}
          {notification.relationshipDuration && (
            <span>Your mentor for {notification.relationshipDuration}</span>
          )}
        </div>

        {/* Quick Reply Suggestions */}
        {!showReplyBox && (
          <div className="flex flex-wrap gap-2">
            {quickReplies.map((reply) => (
              <Button
                key={reply}
                variant="outline"
                size="sm"
                onClick={() => handleQuickReply(reply)}
                className="text-xs"
              >
                {reply}
              </Button>
            ))}
          </div>
        )}

        {/* Inline Reply Composer */}
        {showReplyBox && (
          <div className="space-y-2">
            <Textarea
              placeholder="Type your reply..."
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              className="min-h-[80px] resize-none"
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowReplyBox(false);
                  setReplyMessage("");
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSendReply}
                disabled={!replyMessage.trim()}
                className="ml-auto"
              >
                <Send className="w-4 h-4 mr-2" />
                Send
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex gap-2">
        {!showReplyBox && (
          <>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowReplyBox(true)}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Reply
            </Button>
            <Button
              className="flex-1"
              onClick={onView}
            >
              View Conversation
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}

export default MentoringNotification;
