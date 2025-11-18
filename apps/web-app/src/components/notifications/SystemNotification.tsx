"use client";

import React, { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Info, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2,
  X,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import ReactMarkdown from "react-markdown";

export interface SystemNotificationProps {
  notification: {
    id: string;
    title: string;
    body: string;
    priority: 'info' | 'warning' | 'error' | 'success';
    actionUrl?: string;
    actionLabel?: string;
    imageUrl?: string;
    videoUrl?: string;
    attachments?: Array<{
      name: string;
      url: string;
      size?: string;
    }>;
    expiresAt?: Date;
    persistent?: boolean;
  };
  onAction?: () => void;
  onDismiss?: () => void;
  className?: string;
}

const priorityConfig = {
  info: {
    icon: Info,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50 dark:bg-yellow-950',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
  },
  error: {
    icon: AlertCircle,
    color: 'text-red-500',
    bgColor: 'bg-red-50 dark:bg-red-950',
    borderColor: 'border-red-200 dark:border-red-800',
  },
  success: {
    icon: CheckCircle2,
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-950',
    borderColor: 'border-green-200 dark:border-green-800',
  },
};

export function SystemNotification({
  notification,
  onAction,
  onDismiss,
  className = "",
}: SystemNotificationProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = priorityConfig[notification.priority];
  const Icon = config.icon;
  
  const shouldTruncate = notification.body.length > 200;
  const displayBody = shouldTruncate && !isExpanded 
    ? notification.body.substring(0, 200) + '...' 
    : notification.body;

  const timeRemaining = notification.expiresAt 
    ? Math.max(0, Math.floor((notification.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60)))
    : null;

  return (
    <Card className={`w-full max-w-2xl ${config.borderColor} ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className={`p-2 rounded-full ${config.bgColor}`}>
              <Icon className={`w-5 h-5 ${config.color}`} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{notification.title}</h3>
              {timeRemaining !== null && timeRemaining > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Expires in {timeRemaining}h
                </p>
              )}
            </div>
          </div>
          {!notification.persistent && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDismiss}
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Image Display */}
        {notification.imageUrl && (
          <div className="rounded-lg overflow-hidden">
            <img
              src={notification.imageUrl}
              alt={notification.title}
              className="w-full h-auto object-cover"
              loading="lazy"
            />
          </div>
        )}

        {/* Video Embed */}
        {notification.videoUrl && (
          <div className="aspect-video rounded-lg overflow-hidden">
            <iframe
              src={notification.videoUrl}
              title={notification.title}
              className="w-full h-full"
              allowFullScreen
            />
          </div>
        )}

        {/* Body Content with Markdown */}
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown
            components={{
              a: ({ node, ...props }) => (
                <a
                  {...props}
                  target={props.href?.startsWith('http') ? '_blank' : undefined}
                  rel={props.href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="text-blue-500 hover:underline inline-flex items-center gap-1"
                >
                  {props.children}
                  {props.href?.startsWith('http') && (
                    <ExternalLink className="w-3 h-3" />
                  )}
                </a>
              ),
            }}
          >
            {displayBody}
          </ReactMarkdown>
        </div>

        {/* Read More Toggle */}
        {shouldTruncate && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full"
          >
            {isExpanded ? (
              <>
                Show less <ChevronUp className="w-4 h-4 ml-1" />
              </>
            ) : (
              <>
                Read more <ChevronDown className="w-4 h-4 ml-1" />
              </>
            )}
          </Button>
        )}

        {/* Attachments */}
        {notification.attachments && notification.attachments.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Attachments</p>
            <div className="space-y-2">
              {notification.attachments.map((attachment, index) => (
                <a
                  key={index}
                  href={attachment.url}
                  download
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{attachment.name}</p>
                      {attachment.size && (
                        <p className="text-xs text-muted-foreground">{attachment.size}</p>
                      )}
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Persistent Badge */}
        {notification.persistent && (
          <Badge variant="secondary" className="w-fit">
            Action required
          </Badge>
        )}
      </CardContent>

      {(notification.actionUrl || !notification.persistent) && (
        <CardFooter className="flex gap-2">
          {!notification.persistent && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={onDismiss}
            >
              Dismiss
            </Button>
          )}
          {notification.actionUrl && (
            <Button
              className="flex-1"
              onClick={onAction}
            >
              {notification.actionLabel || 'Take Action'}
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}

export default SystemNotification;
