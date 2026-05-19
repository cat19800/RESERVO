'use client';

import { useQuery } from '@tanstack/react-query';
import { type ApiResult, type SessionUserDto, isFailure } from '@/types/api';

export function useSession() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      const json = (await res.json()) as ApiResult<{ user: SessionUserDto | null }>;
      if (isFailure(json)) return null;
      return json.data.user;
    },
    staleTime: 60_000,
  });
}
