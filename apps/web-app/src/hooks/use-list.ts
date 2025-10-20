import { useState, useCallback } from "react";
import { Request } from "./request-query";

// List hook to preserve exact behavior from Rails implementation
export function useList<
  T extends Record<string, unknown> = Record<string, unknown>
>(initialRequest: Request<T>) {
  const [request, setRequest] = useState(initialRequest);

  const setCriteria = useCallback((criteria: string) => {
    setRequest((prev) => ({
      ...prev,
      query: { ...prev.query, criteria, page: undefined } as unknown as T,
    }));
  }, []);

  const setOrder = useCallback((order: string) => {
    setRequest((prev) => ({
      ...prev,
      query: { ...prev.query, order, page: undefined } as unknown as T,
    }));
  }, []);

  const setPage = useCallback((page: number) => {
    setRequest((prev) => ({
      ...prev,
      query: { ...prev.query, page } as unknown as T,
    }));
  }, []);

  const setQuery = useCallback((query: T) => {
    setRequest((prev) => ({
      ...prev,
      query,
    }));
  }, []);

  return {
    request,
    setCriteria,
    setOrder,
    setPage,
    setQuery,
  };
}
