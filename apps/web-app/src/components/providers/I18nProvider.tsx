"use client";

import React, { ReactNode } from "react";

interface I18nProviderProps {
  children: ReactNode;
}

/**
 * Basic I18n provider for internationalization support
 * This is a placeholder implementation
 */
export function I18nProvider({ children }: I18nProviderProps) {
  return <>{children}</>;
}

export default I18nProvider;
