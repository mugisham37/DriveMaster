import { useCallback } from 'react';

interface ErrorHandlerOptions {
  defaultError?: string;
  onError?: (error: unknown) => void;
}

export function useErrorHandler(error: unknown, options: ErrorHandlerOptions = {}) {
  const { defaultError = 'An error occurred', onError } = options;

  const handleError = useCallback((err: unknown) => {
    console.error('Error handled:', err);
    
    if (onError) {
      onError(err);
    }
    
    // You can add more error handling logic here
    // such as sending to error reporting service
  }, [onError]);

  if (error) {
    handleError(error);
  }

  return {
    handleError,
    errorMessage: error instanceof Error ? error.message : defaultError,
  };
}