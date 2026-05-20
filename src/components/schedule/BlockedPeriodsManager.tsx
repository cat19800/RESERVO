'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFormatter, useTranslations } from 'next-intl';
import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { type ApiResult, isFailure } from '@/types/api';
import {
  blockedPeriodCreateSchema,
  type BlockedPeriodCreateInput,
  type BlockedPeriodResponse,
} from '@/schemas/blocked-period';

async function listPeriods(): Promise<BlockedPeriodResponse[]> {
  const res = await fetch('/api/professionals/me/blocked-periods', { credentials: 'include' });
  const json = (await res.json()) as ApiResult<BlockedPeriodResponse[]>;
  if (isFailure(json)) throw new Error(json.error.code);
  return json.data;
}

async function createPeriod(input: BlockedPeriodCreateInput): Promise<BlockedPeriodResponse> {
  const res = await fetch('/api/professionals/me/blocked-periods', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });
  const json = (await res.json()) as ApiResult<BlockedPeriodResponse>;
  if (isFailure(json)) throw new Error(json.error.code);
  return json.data;
}

async function deletePeriod(id: string): Promise<void> {
  const res = await fetch(`/api/professionals/me/blocked-periods/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const json = (await res.json()) as ApiResult<{ ok: true }>;
  if (isFailure(json)) throw new Error(json.error.code);
}

// `<input type="datetime-local">` produces "YYYY-MM-DDTHH:mm" (no seconds, no TZ).
// We append seconds + Z for ISO compliance, treating the wall clock as UTC.
// The schedule stores blocked periods in UTC, which is fine for the DB; the
// display is naive local on the form. (Phase 12 polish can introduce TZ-aware
// pickers if needed.)
function formToIso(local: string): string {
  if (!local) return '';
  return local.length === 16 ? `${local}:00.000Z` : `${local}.000Z`;
}

function isoToForm(iso: string): string {
  return iso.slice(0, 16);
}

export function BlockedPeriodsManager() {
  const t = useTranslations();
  const fmt = useFormatter();
  const qc = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const { data: periods = [], isLoading } = useQuery({
    queryKey: ['pro', 'blockedPeriods'],
    queryFn: listPeriods,
  });

  const form = useForm<BlockedPeriodCreateInput>({
    resolver: zodResolver(blockedPeriodCreateSchema),
    defaultValues: { startsAt: '', endsAt: '', reason: '' },
  });

  const createMut = useMutation({
    mutationFn: createPeriod,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['pro', 'blockedPeriods'] });
      form.reset({ startsAt: '', endsAt: '', reason: '' });
      setSheetOpen(false);
    },
  });

  const deleteMut = useMutation({
    mutationFn: deletePeriod,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['pro', 'blockedPeriods'] });
      setPendingDelete(null);
    },
  });

  function tFieldError(key?: string) {
    if (!key) return undefined;
    if (key.startsWith('pro.schedule.errors.')) return t(key as 'pro.schedule.errors.invalidTime');
    return key;
  }

  return (
    <section className="grid gap-4">
      <header className="flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold tracking-tight">
            {t('pro.schedule.blockedPeriods.title')}
          </h2>
          <p className="text-muted-foreground text-sm">
            {t('pro.schedule.blockedPeriods.subtitle')}
          </p>
        </div>
        <Button onClick={() => setSheetOpen(true)} variant="outline" size="sm">
          <Plus className="mr-1 h-4 w-4" aria-hidden />
          {t('pro.schedule.blockedPeriods.add')}
        </Button>
      </header>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">{t('common.loading')}</p>
      ) : periods.length === 0 ? (
        <div className="border-border bg-muted/30 rounded-2xl border border-dashed p-6 text-center">
          <p className="text-muted-foreground text-sm">{t('pro.schedule.blockedPeriods.empty')}</p>
        </div>
      ) : (
        <ul className="grid gap-2">
          {periods.map((p) => (
            <li
              key={p.id}
              className="border-border bg-card flex items-center gap-3 rounded-2xl border p-3 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {fmt.dateTime(new Date(p.startsAt), { dateStyle: 'medium', timeStyle: 'short' })}
                  {' – '}
                  {fmt.dateTime(new Date(p.endsAt), { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
                {p.reason && (
                  <p className="text-muted-foreground truncate text-xs">{p.reason}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPendingDelete(p.id)}
                aria-label={t('common.delete')}
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t('pro.schedule.blockedPeriods.addTitle')}</SheetTitle>
          </SheetHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((values) =>
                createMut.mutate({
                  ...values,
                  startsAt: formToIso(values.startsAt),
                  endsAt: formToIso(values.endsAt),
                  reason: values.reason ?? '',
                }),
              )}
              className="grid gap-4 px-4 py-2"
            >
              <FormField
                control={form.control}
                name="startsAt"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>{t('pro.schedule.blockedPeriods.startsAt')}</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        value={isoToForm(field.value ?? '')}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage>{tFieldError(fieldState.error?.message)}</FormMessage>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endsAt"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>{t('pro.schedule.blockedPeriods.endsAt')}</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        value={isoToForm(field.value ?? '')}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage>{tFieldError(fieldState.error?.message)}</FormMessage>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('pro.schedule.blockedPeriods.reason')}{' '}
                      <span className="text-muted-foreground text-xs font-normal">
                        ({t('common.optional')})
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setSheetOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={createMut.isPending}>
                  {createMut.isPending ? t('common.saving') : t('common.save')}
                </Button>
              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('pro.schedule.blockedPeriods.deleteConfirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('pro.schedule.blockedPeriods.deleteConfirmBody')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingDelete(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => pendingDelete && deleteMut.mutate(pendingDelete)}
              disabled={deleteMut.isPending}
            >
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
