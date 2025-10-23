import { useState, useCallback } from "react";
import { Request } from "./request-query";

export function useList(initialRequest: Request) {
  const [request, setRequest] = useState<Request>(initialRequest);

  const setCriteria = useCallback((criteria: string) => {
    setRequest((prev) => ({
      ...prev,
      query: {
        ...prev.query,
        criteria,
        page: undefined, // Reset page when criteria changes
      },
    }));
  }, []);

  const setPage = useCallback((page: number) => {
    setRequest((prev) => ({
      ...prev,
      query: {
        ...prev.query,
        page,
      },
    }));
  }, []);

  const setQuery = useCallback((query: Record<string, any>) => {
    setRequest((prev) => ({
      ...prev,
      query,
    }));
  }, []);

  const setOrder = useCallback((order: string) => {
    setRequest((prev) => ({
      ...prev,
      query: {
        ...prev.query,
        order,
        page: undefined, // Reset page when order changes
      },
    }));
  }, []);

  return {
    request,
    setCriteria,
    setPage,
    setQuery,
    setOrder,
  };
}
