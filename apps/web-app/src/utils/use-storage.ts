import { useState } from 'react'

// Simple replacement for StoredMemoryValue functionality
class StoredMemoryValue<T> {
  constructor(
    private key: string,
    private persistent: boolean,
    private defaultValue: T
  ) {}

  get(): T {
    if (this.persistent && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(this.key)
        return stored ? JSON.parse(stored) : this.defaultValue
      } catch {
        return this.defaultValue
      }
    }
    return this.defaultValue
  }

  set(value: T): void {
    if (this.persistent && typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.key, JSON.stringify(value))
      } catch {
        // Ignore storage errors
      }
    }
  }
}

// Simple replacement for useMutableMemoryValue
function useMutableMemoryValue<T>(memoryValue: StoredMemoryValue<T>): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => memoryValue.get())

  const setValueAndStore = (newValue: T) => {
    setValue(newValue)
    memoryValue.set(newValue)
  }

  return [value, setValueAndStore]
}

export function useStorage<T>(key: string, initialValue: T) {
  const memoryValue = new StoredMemoryValue<T>(key, true, initialValue)

  return useMutableMemoryValue(memoryValue)
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = JSON.parse(localStorage.getItem(key) || '') as T

      return item
    } catch {
      return initialValue
    }
  })

  const setValue = (value: T) => {
    try {
      setStoredValue(value)

      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.log(error)
    }
  }

  return [storedValue, setValue]
}
