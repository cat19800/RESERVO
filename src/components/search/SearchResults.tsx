'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';

import { ProCard } from '@/components/search/ProCard';
import { FilterDrawer, type SearchFilters } from '@/components/search/FilterDrawer';
import { SearchBar } from '@/components/search/SearchBar';
import { Button } from '@/components/ui/button';
import { type ApiResult, isFailure } from '@/types/api';
import { type ProSearchResponse, CATEGORIES, SORT_OPTIONS } from '@/schemas/search';

const PAGE_SIZE = 12;

function readFilters(params: URLSearchParams): SearchFilters {
  const cat = params.get('category');
  const city = params.get('city')?.trim();
  const q = params.get('q')?.trim();
  const minRatingRaw = params.get('minRating');
  const sortRaw = params.get('sort');
  return {
    category: cat && (CATEGORIES as readonly string[]).includes(cat) ? (cat as SearchFilters['category']) : undefined,
    city: city || undefined,
    q: q || undefined,
    minRating: minRatingRaw ? Number(minRatingRaw) : undefined,
    sort:
      sortRaw && (SORT_OPTIONS as readonly string[]).includes(sortRaw)
        ? (sortRaw as SearchFilters['sort'])
        : 'rating',
  };
}

function writeFilters(f: SearchFilters): string {
  const p = new URLSearchParams();
  if (f.category) p.set('category', f.category);
  if (f.city) p.set('city', f.city);
  if (f.q) p.set('q', f.q);
  if (f.minRating !== undefined && f.minRating > 0) p.set('minRating', String(f.minRating));
  if (f.sort && f.sort !== 'rating') p.set('sort', f.sort);
  return p.toString();
}

async function fetchPros(f: SearchFilters, page: number): Promise<ProSearchResponse> {
  const p = new URLSearchParams();
  if (f.category) p.set('category', f.category);
  if (f.city) p.set('city', f.city);
  if (f.q) p.set('q', f.q);
  if (f.minRating !== undefined) p.set('minRating', String(f.minRating));
  if (f.sort) p.set('sort', f.sort);
  p.set('page', String(page));
  p.set('pageSize', String(PAGE_SIZE));

  const res = await fetch(`/api/pros?${p.toString()}`, { credentials: 'include' });
  const json = (await res.json()) as ApiResult<ProSearchResponse>;
  if (isFailure(json)) throw new Error(json.error.code);
  return json.data;
}

export function SearchResults({ locale }: { locale: string }) {
  const t = useTranslations();
  const router = useRouter();
  const params = useSearchParams();
  const filters = readFilters(params);
  const [page, setPage] = useState(0);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['pros', 'search', filters, page],
    queryFn: () => fetchPros(filters, page),
    placeholderData: (prev) => prev,
  });

  function updateFilters(next: SearchFilters) {
    setPage(0);
    const qs = writeFilters(next);
    router.replace(`/${locale}/search${qs ? `?${qs}` : ''}`);
  }

  const chips: { key: keyof SearchFilters; label: string }[] = [];
  if (filters.category) {
    chips.push({
      key: 'category',
      label: t(`categories.${filters.category}` as 'categories.DOCTOR'),
    });
  }
  if (filters.city) chips.push({ key: 'city', label: filters.city });
  if (filters.minRating !== undefined && filters.minRating > 0) {
    chips.push({ key: 'minRating', label: `≥ ${filters.minRating.toFixed(1)} ★` });
  }
  if (filters.q) chips.push({ key: 'q', label: `"${filters.q}"` });

  function clearOne(key: keyof SearchFilters) {
    const next: SearchFilters = { ...filters };
    delete next[key];
    if (key === 'sort') next.sort = 'rating';
    updateFilters(next);
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <SearchBar locale={locale} defaultValue={filters.q ?? ''} />
        </div>
        <FilterDrawer value={filters} onChange={updateFilters} />
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chips.map((c) => (
            <button
              key={`${c.key}-${c.label}`}
              type="button"
              onClick={() => clearOne(c.key)}
              className="bg-muted hover:bg-muted/80 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs"
              aria-label={t('search.clearFilter', { label: c.label })}
            >
              {c.label}
              <X className="h-3 w-3" aria-hidden />
            </button>
          ))}
        </div>
      )}

      {isLoading && !data ? (
        <p className="text-muted-foreground text-sm">{t('common.loading')}</p>
      ) : isError ? (
        <p className="text-destructive text-sm">{t('search.errorLoading')}</p>
      ) : !data || data.items.length === 0 ? (
        <div className="border-border bg-muted/30 rounded-2xl border border-dashed p-6 text-center">
          <p className="text-sm font-medium">{t('search.empty')}</p>
          <p className="text-muted-foreground mt-1 text-xs">{t('search.tryAnother')}</p>
        </div>
      ) : (
        <>
          <p className="text-muted-foreground text-xs">
            {t('search.resultsCount', { count: data.total })}
          </p>
          <ul className="grid gap-2">
            {data.items.map((p) => (
              <li key={p.id}>
                <ProCard pro={p} locale={locale} />
              </li>
            ))}
          </ul>
          {data.total > (page + 1) * PAGE_SIZE && (
            <Button
              variant="outline"
              onClick={() => setPage((p) => p + 1)}
              disabled={isLoading}
              className="w-full"
            >
              {t('search.loadMore')}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
