'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type ApiResult, isFailure } from '@/types/api';
import { type NotificationsListDto } from '@/schemas/notification';

const KEY = ['notifications'] as const;

async function fetchNotifications(): Promise<NotificationsListDto> {
  const res = await fetch('/api/notifications', { credentials: 'include' });
  const json = (await res.json()) as ApiResult<NotificationsListDto>;
  if (isFailure(json)) throw new Error(json.error.code);
  return json.data;
}

/**
 * Polled list of in-app notifications. Polls every 30s and refetches on tab
 * focus. Disabled when no user is signed in (`enabled` flag).
 */
export function useNotifications(enabled: boolean) {
  return useQuery({
    queryKey: KEY,
    queryFn: fetchNotifications,
    enabled,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
        credentials: 'include',
      });
      const json = (await res.json()) as ApiResult<{ id: string }>;
      if (isFailure(json)) throw new Error(json.error.code);
      return json.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        credentials: 'include',
      });
      const json = (await res.json()) as ApiResult<{ updated: number }>;
      if (isFailure(json)) throw new Error(json.error.code);
      return json.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
