/**
 * Collaboration Cursor Component
 *
 * Displays real-time cursors and text selections from other users
 * for collaborative editing experiences.
 *
 * Requirements: 9.3
 */

"use client";

import React, { useEffect, useState, useRef } from "react";
import { useCollaboration } from "../../hooks/use-real-time-content";
import type { UserPresence, CollaborationEvent } from "../../types/websocket";

// ============================================================================
// Types
// ============================================================================

export interface CollaborationCursorProps {
  itemId: string;
  enabled?: boolean;
  editorRef?: React.RefObject<HTMLElement>;
  onCursorMove?: (position: { line: number; column: number }) => void;
  onTextSelect?: (selection: {
    start: number;
    end: number;
    text: string;
  }) => void;
  className?: string;
}

export interface RemoteCursorProps {
  user: UserPresence;
  position: { line: number; column: number };
  color: string;
}

export interface RemoteSelectionProps {
  user: UserPresence;
  selection: { start: number; end: number; text: string };
  color: string;
}

// ============================================================================
// Remote Cursor Component
// ============================================================================

export function RemoteCursor({ user, position, color }: RemoteCursorProps) {
  const [isVisible, setIsVisible] = useState(true);

  // Blink cursor periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible((prev) => !prev);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`absolute pointer-events-none z-10 transition-opacity duration-200 ${
        isVisible ? "opacity-100" : "opacity-50"
      }`}
      style={{
        left: `${position.column * 8}px`, // Approximate character width
        top: `${position.line * 20}px`, // Approximate line height
      }}
    >
      {/* Cursor line */}
      <div className="w-0.5 h-5" style={{ backgroundColor: color }} />

      {/* User label */}
      <div
        className="absolute top-0 left-1 px-1 py-0.5 text-xs text-white rounded whitespace-nowrap"
        style={{ backgroundColor: color }}
      >
        {user.displayName}
      </div>
    </div>
  );
}

// ============================================================================
// Remote Selection Component
// ============================================================================

export function RemoteSelection({
  user,
  selection,
  color,
}: RemoteSelectionProps) {
  return (
    <div
      className="absolute pointer-events-none z-5"
      style={{
        backgroundColor: `${color}20`, // 20% opacity
        border: `1px solid ${color}`,
      }}
    >
      {/* Selection highlight would be positioned based on text coordinates */}
      <div className="absolute top-0 right-0 px-1 py-0.5 text-xs text-white rounded-bl text-right">
        {user.displayName}
      </div>
    </div>
  );
}

// ============================================================================
// Main Collaboration Cursor Component
// ============================================================================

export function CollaborationCursor({
  itemId,
  enabled = true,
  editorRef,
  onCursorMove,
  onTextSelect,
  className = "",
}: CollaborationCursorProps) {
  const {
    session,
    participants,
    sendCursorPosition,
    sendTextSelection,
    isCollaborating,
  } = useCollaboration({
    itemId,
    enabled,
  });

  const [localCursorPosition, setLocalCursorPosition] = useState<{
    line: number;
    column: number;
  } | null>(null);
  const [localSelection, setLocalSelection] = useState<{
    start: number;
    end: number;
    text: string;
  } | null>(null);
  const lastSentPosition = useRef<{ line: number; column: number } | null>(
    null,
  );
  const lastSentSelection = useRef<{
    start: number;
    end: number;
    text: string;
  } | null>(null);

  // User colors for cursors and selections
  const userColors = [
    "#3B82F6", // Blue
    "#EF4444", // Red
    "#10B981", // Green
    "#F59E0B", // Yellow
    "#8B5CF6", // Purple
    "#F97316", // Orange
    "#06B6D4", // Cyan
    "#84CC16", // Lime
  ];

  const getUserColor = (userId: string): string => {
    const index = Array.from(participants.keys()).indexOf(userId);
    return userColors[index % userColors.length];
  };

  // Track local cursor position
  useEffect(() => {
    if (!enabled || !editorRef?.current) return;

    const editor = editorRef.current;

    const handleSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);

      // Calculate cursor position (simplified - would need more sophisticated logic for real editor)
      const position = calculateCursorPosition(range, editor);

      if (
        position &&
        (!lastSentPosition.current ||
          position.line !== lastSentPosition.current.line ||
          position.column !== lastSentPosition.current.column)
      ) {
        setLocalCursorPosition(position);
        sendCursorPosition(position);
        onCursorMove?.(position);
        lastSentPosition.current = position;
      }

      // Handle text selection
      if (!selection.isCollapsed) {
        const selectedText = selection.toString();
        const selectionData = {
          start: range.startOffset,
          end: range.endOffset,
          text: selectedText,
        };

        if (
          !lastSentSelection.current ||
          selectionData.start !== lastSentSelection.current.start ||
          selectionData.end !== lastSentSelection.current.end
        ) {
          setLocalSelection(selectionData);
          sendTextSelection(selectionData);
          onTextSelect?.(selectionData);
          lastSentSelection.current = selectionData;
        }
      } else {
        setLocalSelection(null);
        lastSentSelection.current = null;
      }
    };

    document.addEventListener("selectionchange", handleSelectionChange);

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [
    enabled,
    editorRef,
    sendCursorPosition,
    sendTextSelection,
    onCursorMove,
    onTextSelect,
  ]);

  if (!enabled || !isCollaborating || !session) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      {/* Remote cursors */}
      {Array.from(participants.values()).map((participant) => {
        if (!participant.currentPosition) return null;

        return (
          <RemoteCursor
            key={`cursor-${participant.userId}`}
            user={participant}
            position={participant.currentPosition}
            color={getUserColor(participant.userId)}
          />
        );
      })}

      {/* Remote selections */}
      {Array.from(participants.values()).map((participant) => {
        if (!participant.currentSelection) return null;

        return (
          <RemoteSelection
            key={`selection-${participant.userId}`}
            user={participant}
            selection={participant.currentSelection}
            color={getUserColor(participant.userId)}
          />
        );
      })}
    </div>
  );
}

// ============================================================================
// Collaboration Status Component
// ============================================================================

export interface CollaborationStatusProps {
  itemId: string;
  enabled?: boolean;
  showDetails?: boolean;
  className?: string;
}

export function CollaborationStatus({
  itemId,
  enabled = true,
  showDetails = false,
  className = "",
}: CollaborationStatusProps) {
  const { session, participants, isCollaborating } = useCollaboration({
    itemId,
    enabled,
  });

  if (!enabled) {
    return null;
  }

  if (!isCollaborating || !session) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        No active collaboration
      </div>
    );
  }

  const participantCount = participants.length;

  return (
    <div className={`${className}`}>
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="text-sm font-medium text-gray-700">
          Collaborating with {participantCount} user
          {participantCount !== 1 ? "s" : ""}
        </span>
      </div>

      {showDetails && (
        <div className="mt-2 space-y-1">
          <div className="text-xs text-gray-500">
            Session started: {new Date(session.startedAt).toLocaleTimeString()}
          </div>
          <div className="text-xs text-gray-500">
            Last activity: {new Date(session.lastActivity).toLocaleTimeString()}
          </div>
          {session.events.length > 0 && (
            <div className="text-xs text-gray-500">
              Total events: {session.events.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculates cursor position from a DOM range (simplified implementation)
 */
function calculateCursorPosition(
  range: Range,
  container: HTMLElement,
): { line: number; column: number } | null {
  try {
    // This is a simplified implementation
    // In a real editor, you'd need more sophisticated logic to calculate line/column positions

    const textContent = container.textContent || "";
    const offset = range.startOffset;

    // Count lines up to the cursor position
    const textBeforeCursor = textContent.substring(0, offset);
    const lines = textBeforeCursor.split("\n");
    const line = lines.length - 1;
    const column = lines[lines.length - 1].length;

    return { line, column };
  } catch (error) {
    console.warn("Failed to calculate cursor position:", error);
    return null;
  }
}

// ============================================================================
// Collaboration Toolbar Component
// ============================================================================

export interface CollaborationToolbarProps {
  itemId: string;
  enabled?: boolean;
  showPresence?: boolean;
  showStatus?: boolean;
  className?: string;
}

export function CollaborationToolbar({
  itemId,
  enabled = true,
  showPresence = true,
  showStatus = true,
  className = "",
}: CollaborationToolbarProps) {
  const { isCollaborating } = useCollaboration({
    itemId,
    enabled,
  });

  if (!enabled) {
    return null;
  }

  return (
    <div
      className={`flex items-center justify-between p-2 bg-gray-50 border-b ${className}`}
    >
      <div className="flex items-center space-x-4">
        {showPresence && (
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Active:</span>
            {/* PresenceIndicator would be imported and used here */}
          </div>
        )}
      </div>

      <div className="flex items-center space-x-2">
        {showStatus && (
          <CollaborationStatus
            itemId={itemId}
            enabled={enabled}
            showDetails={false}
          />
        )}

        {isCollaborating && (
          <div className="flex items-center space-x-1 text-xs text-green-600">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>Live</span>
          </div>
        )}
      </div>
    </div>
  );
}
