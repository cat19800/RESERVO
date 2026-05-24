'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function SearchBar({ locale, defaultValue = '' }: { locale: string; defaultValue?: string }) {
  const t = useTranslations();
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  function go(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    const params = new URLSearchParams();
    if (trimmed) params.set('q', trimmed);
    router.push(`/${locale}/search${params.toString() ? `?${params.toString()}` : ''}`);
  }

  return (
    <form onSubmit={go} role="search" className="relative">
      <Search
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
        aria-hidden
      />
      <Input
        type="search"
        inputMode="search"
        placeholder={t('search.placeholder')}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        aria-label={t('search.placeholder')}
        className="bg-card h-11 rounded-full pl-10 shadow-sm"
      />
    </form>
  );
}
