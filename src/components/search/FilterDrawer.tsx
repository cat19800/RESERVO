'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { SlidersHorizontal } from 'lucide-react';

import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { CATEGORIES, SORT_OPTIONS } from '@/schemas/search';
import { cn } from '@/lib/utils';

export type SearchFilters = {
  category?: (typeof CATEGORIES)[number];
  city?: string;
  q?: string;
  minRating?: number;
  sort: (typeof SORT_OPTIONS)[number];
};

const RATINGS = [0, 3, 3.5, 4, 4.5] as const;

type Props = {
  value: SearchFilters;
  onChange: (next: SearchFilters) => void;
  triggerClassName?: string;
};

export function FilterDrawer({ value, onChange, triggerClassName }: Props) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<SearchFilters>(value);
  const [snapshot, setSnapshot] = useState(value);

  // Snapshot-on-render: re-sync from `value` whenever it changes externally
  // (e.g. user clicked a filter chip), as long as the sheet is closed.
  if (!open && value !== snapshot) {
    setSnapshot(value);
    setLocal(value);
  }

  const activeCount = countActive(value);

  function apply() {
    onChange(local);
    setOpen(false);
  }

  function reset() {
    const cleared: SearchFilters = { sort: 'rating' };
    setLocal(cleared);
    onChange(cleared);
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          buttonVariants({ variant: 'outline', size: 'sm' }),
          'gap-2',
          triggerClassName,
        )}
      >
        <SlidersHorizontal className="h-4 w-4" aria-hidden />
        {t('search.filters')}
        {activeCount > 0 && (
          <span className="bg-primary text-primary-foreground inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold">
            {activeCount}
          </span>
        )}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t('search.filterTitle')}</SheetTitle>
          </SheetHeader>
          <div className="grid gap-4 px-4 py-2">
            <div className="grid gap-1.5">
              <Label>{t('search.category')}</Label>
              <Select
                value={local.category ?? '__any__'}
                onValueChange={(v) =>
                  setLocal({
                    ...local,
                    category: v === '__any__' ? undefined : (v as SearchFilters['category']),
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__any__">{t('search.anyCategory')}</SelectItem>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {t(`categories.${c}` as 'categories.DOCTOR')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="filter-city">{t('search.city')}</Label>
              <Input
                id="filter-city"
                value={local.city ?? ''}
                onChange={(e) => setLocal({ ...local, city: e.target.value || undefined })}
              />
            </div>

            <div className="grid gap-1.5">
              <Label>{t('search.minRating')}</Label>
              <div className="flex flex-wrap gap-2">
                {RATINGS.map((r) => {
                  const active = (local.minRating ?? 0) === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() =>
                        setLocal({ ...local, minRating: r === 0 ? undefined : r })
                      }
                      aria-pressed={active}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-sm transition',
                        active
                          ? 'bg-primary border-primary text-primary-foreground'
                          : 'border-border bg-card hover:bg-muted',
                      )}
                    >
                      {r === 0 ? t('search.anyRating') : `≥ ${r.toFixed(1)} ★`}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label>{t('search.sort')}</Label>
              <Select
                value={local.sort}
                onValueChange={(v) => setLocal({ ...local, sort: v as SearchFilters['sort'] })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">{t('search.sortByRating')}</SelectItem>
                  <SelectItem value="recent">{t('search.sortByRecent')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-t px-4 pt-4 pb-2">
            <Button variant="ghost" onClick={reset}>
              {t('search.resetFilters')}
            </Button>
            <Button onClick={apply}>{t('search.applyFilters')}</Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function countActive(f: SearchFilters): number {
  let n = 0;
  if (f.category) n++;
  if (f.city && f.city.trim()) n++;
  if (f.minRating !== undefined && f.minRating > 0) n++;
  if (f.sort && f.sort !== 'rating') n++;
  return n;
}
