import { SWRConfiguration } from 'swr';

export const swrConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 10000, // 10 seconds - avoid duplicate requests
  errorRetryCount: 3,
  errorRetryInterval: 5000,
  shouldRetryOnError: (error) => {
    // Don't retry on 4xx errors
    if (error.status >= 400 && error.status < 500) return false;
    return true;
  },
  // Keep previous data while revalidating
  keepPreviousData: true,
  // Shared cache across all hooks
  provider: () => new Map(),
};
