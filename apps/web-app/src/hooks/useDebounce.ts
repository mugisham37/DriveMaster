/**
 * useDebounce Hook
 * 
 * Debounces a value by delaying updates until after a specified delay
 * Useful for auto-save, search inputs, and other scenarios where
 * you want to wait for user to stop typing
 */

import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
