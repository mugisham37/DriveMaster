"use client";

import React from "react";

interface SessionProviderProps {
  children: React.ReactNode;
  session?: unknown;
}

export function SessionProvider({ children }: SessionProviderProps) {
  // Simple pass-through provider - actual session management 
  // should be handled by authentication context
  return <>{children}</>;
}
