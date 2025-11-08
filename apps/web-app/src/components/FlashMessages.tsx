"use client";

import { useEffect, useState } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";

type FlashMessageType = "success" | "error" | "info" | "warning";

interface FlashMessage {
  id: string;
  type: FlashMessageType;
  message: string;
  duration?: number;
}

/**
 * FlashMessages component
 * Displays flash messages/notifications to the user
 */
export function FlashMessages() {
  const [messages, setMessages] = useState<FlashMessage[]>([]);

  useEffect(() => {
    // Check for flash messages in sessionStorage
    const storedMessages = sessionStorage.getItem("flashMessages");
    if (storedMessages) {
      try {
        const parsedMessages = JSON.parse(storedMessages) as FlashMessage[];
        setMessages(parsedMessages);
        // Clear from sessionStorage after reading
        sessionStorage.removeItem("flashMessages");
      } catch (error) {
        console.error("Failed to parse flash messages:", error);
      }
    }

    // Listen for custom flash message events
    const handleFlashMessage = (event: CustomEvent<FlashMessage>) => {
      setMessages((prev) => [...prev, event.detail]);
    };

    window.addEventListener(
      "flashMessage",
      handleFlashMessage as EventListener,
    );

    return () => {
      window.removeEventListener(
        "flashMessage",
        handleFlashMessage as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    // Auto-remove messages after their duration
    const timers = messages.map((message) => {
      if (message.duration) {
        return setTimeout(() => {
          removeMessage(message.id);
        }, message.duration);
      }
      return null;
    });

    return () => {
      timers.forEach((timer) => {
        if (timer) clearTimeout(timer);
      });
    };
  }, [messages]);

  const removeMessage = (id: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id));
  };

  const getIcon = (type: FlashMessageType) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5" />;
      case "error":
        return <AlertCircle className="w-5 h-5" />;
      case "warning":
        return <AlertTriangle className="w-5 h-5" />;
      case "info":
        return <Info className="w-5 h-5" />;
    }
  };

  const getStyles = (type: FlashMessageType) => {
    switch (type) {
      case "success":
        return "bg-green-50 border-green-200 text-green-800";
      case "error":
        return "bg-red-50 border-red-200 text-red-800";
      case "warning":
        return "bg-yellow-50 border-yellow-200 text-yellow-800";
      case "info":
        return "bg-blue-50 border-blue-200 text-blue-800";
    }
  };

  if (messages.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-2"
      aria-live="polite"
      aria-atomic="true"
    >
      {messages.map((message) => (
        <div
          key={message.id}
          className={`
            flex items-start gap-3 p-4 rounded-lg border shadow-lg
            min-w-[300px] max-w-md animate-in slide-in-from-top-5
            ${getStyles(message.type)}
          `}
          role="alert"
        >
          <div className="flex-shrink-0 mt-0.5">{getIcon(message.type)}</div>
          <p className="flex-1 text-sm font-medium">{message.message}</p>
          <button
            onClick={() => removeMessage(message.id)}
            className="flex-shrink-0 hover:opacity-70 transition-opacity"
            aria-label="Close message"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

// Helper function to trigger flash messages
export function showFlashMessage(
  type: FlashMessageType,
  message: string,
  duration: number = 5000,
) {
  const event = new CustomEvent<FlashMessage>("flashMessage", {
    detail: {
      id: `${Date.now()}-${Math.random()}`,
      type,
      message,
      duration,
    },
  });
  window.dispatchEvent(event);
}
