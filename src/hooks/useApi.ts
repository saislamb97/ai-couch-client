// src/hooks/useApi.ts
import { useState, useCallback } from "react";
import axios, { AxiosError } from "axios";

export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const withLoading = useCallback(async <T,>(fn: () => Promise<T>) => {
    setError("");
    setLoading(true);
    try {
      return await fn();
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const e = err as AxiosError<{ detail?: string; error?: string }>;
        setError(e.response?.data?.detail || e.response?.data?.error || e.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Unknown error");
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, setError, withLoading };
}
