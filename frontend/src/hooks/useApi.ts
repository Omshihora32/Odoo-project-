import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import type { PaginationParams } from '@/types';

interface UseApiOptions<T> {
  url: string;
  params?: PaginationParams;
  immediate?: boolean;
  defaultData?: T;
}

interface UseApiReturn<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

export function useApi<T>({ url, params, immediate = true, defaultData }: UseApiOptions<T>): UseApiReturn<T> {
  const [data, setData] = useState<T | null>(defaultData ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get(url, { params });
      setData(response.data.data || response.data);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to fetch data';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [url, JSON.stringify(params)]);

  useEffect(() => {
    if (immediate) {
      fetchData();
    }
  }, [fetchData, immediate]);

  return { data, isLoading, error, refetch: fetchData, setData };
}

export function useApiMutation<TData = unknown, TResponse = unknown>() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(async (
    method: 'post' | 'put' | 'patch' | 'delete',
    url: string,
    data?: TData,
  ): Promise<TResponse> => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await (api as any)[method](url, data);
      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.message || 'Operation failed';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { mutate, isLoading, error };
}
