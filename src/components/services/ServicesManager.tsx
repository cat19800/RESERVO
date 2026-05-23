'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Plus, Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  serviceCreateSchema,
  type ServiceCreateInput,
  type ServiceResponse,
} from '@/schemas/service';

async function listServices(): Promise<ServiceResponse[]> {
  const res = await fetch('/api/professionals/me/services', { credentials: 'include' });
  const json = (await res.json()) as ApiResult<ServiceResponse[]>;
  if (isFailure(json)) throw new Error(json.error.code);
  return json.data;
}

async function createService(input: ServiceCreateInput): Promise<ServiceResponse> {
  const res = await fetch('/api/professionals/me/services', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });
  const json = (await res.json()) as ApiResult<ServiceResponse>;
  if (isFailure(json)) throw new Error(json.error.code);
  return json.data;
}

async function updateService(id: string, input: ServiceCreateInput): Promise<ServiceResponse> {
  const res = await fetch(`/api/professionals/me/services/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });
  const json = (await res.json()) as ApiResult<ServiceResponse>;
  if (isFailure(json)) throw new Error(json.error.code);
  return json.data;
}

async function deleteService(id: string): Promise<void> {
  const res = await fetch(`/api/professionals/me/services/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  const json = (await res.json()) as ApiResult<unknown>;
  if (isFailure(json)) throw new Error(json.error.code);
}

function formatPrice(cents: number, locale: string): string {
  if (cents === 0) return '';
  return new Intl.NumberFormat(locale === 'el' ? 'el-GR' : 'en-IE', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}

export function ServicesManager({ locale }: { locale: string }) {
  const t = useTranslations();
  const qc = useQueryClient();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceResponse | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ServiceResponse | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['pro', 'services'],
    queryFn: listServices,
  });

  const form = useForm<ServiceCreateInput>({
    resolver: zodResolver(serviceCreateSchema),
    defaultValues: { name: '', description: '', durationMinutes: 30, priceCents: 0 },
  });

  function openAdd() {
    setEditing(null);
    setServerError(null);
    form.reset({ name: '', description: '', durationMinutes: 30, priceCents: 0 });
    setSheetOpen(true);
  }

  function openEdit(s: ServiceResponse) {
    setEditing(s);
    setServerError(null);
    form.reset({
      name: s.name,
      description: s.description ?? '',
      durationMinutes: s.durationMinutes,
      priceCents: s.priceCents,
    });
    setSheetOpen(true);
  }

  const saveMut = useMutation({
    mutationFn: (values: ServiceCreateInput) =>
      editing ? updateService(editing.id, values) : createService(values),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['pro', 'services'] });
      setSheetOpen(false);
      setServerError(null);
    },
    onError: (e: Error) => {
      const code = e.message;
      if (code === 'SERVICE_NAME_TAKEN') {
        setServerError(t('pro.services.errors.SERVICE_NAME_TAKEN'));
      } else {
        setServerError(t('auth.errors.INTERNAL_ERROR'));
      }
    },
  });

  const deleteMut = useMutation({
    mutationFn: deleteService,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['pro', 'services'] });
      setPendingDelete(null);
    },
  });

  function tFieldError(key?: string) {
    if (!key) return undefined;
    if (key.startsWith('pro.services.errors.')) return t(key as 'pro.services.errors.nameRequired');
    return key;
  }

  return (
    <section className="grid gap-4">
      <header className="flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold tracking-tight">{t('pro.services.title')}</h2>
          <p className="text-muted-foreground text-sm">{t('pro.services.subtitle')}</p>
        </div>
        <Button onClick={openAdd} variant="default" size="sm">
          <Plus className="mr-1 h-4 w-4" aria-hidden />
          {t('pro.services.add')}
        </Button>
      </header>

      {isLoading ? (
        <p className="text-muted-foreground text-sm">{t('common.loading')}</p>
      ) : services.length === 0 ? (
        <div className="border-border bg-muted/30 rounded-2xl border border-dashed p-6 text-center">
          <p className="text-muted-foreground text-sm">{t('pro.services.empty')}</p>
        </div>
      ) : (
        <ul className="grid gap-2">
          {services.map((s) => (
            <li
              key={s.id}
              className="border-border bg-card flex items-start gap-3 rounded-2xl border p-4 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{s.name}</p>
                  {!s.active && <Badge variant="secondary">{t('pro.services.inactive')}</Badge>}
                </div>
                {s.description && (
                  <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{s.description}</p>
                )}
                <p className="text-muted-foreground mt-2 text-xs">
                  {t('pro.services.durationDisplay', { minutes: s.durationMinutes })}
                  {' · '}
                  <span className="text-foreground font-medium">
                    {s.priceCents === 0
                      ? t('pro.services.priceFree')
                      : formatPrice(s.priceCents, locale)}
                  </span>
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEdit(s)}
                  aria-label={t('common.edit')}
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                </Button>
                {s.active && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPendingDelete(s)}
                    aria-label={t('common.delete')}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editing ? t('pro.services.editTitle') : t('pro.services.addTitle')}
            </SheetTitle>
          </SheetHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((values) => saveMut.mutate(values))}
              className="grid gap-4 px-4 py-2"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>{t('pro.services.name')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage>{tFieldError(fieldState.error?.message)}</FormMessage>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('pro.services.description')}{' '}
                      <span className="text-muted-foreground text-xs font-normal">
                        ({t('common.optional')})
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        rows={3}
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
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="durationMinutes"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>{t('pro.services.duration')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="numeric"
                          min={5}
                          max={480}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage>{tFieldError(fieldState.error?.message)}</FormMessage>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="priceCents"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>{t('pro.services.price')}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min={0}
                          value={(field.value ?? 0) / 100}
                          onChange={(e) => field.onChange(Math.round(Number(e.target.value) * 100))}
                        />
                      </FormControl>
                      <FormMessage>{tFieldError(fieldState.error?.message)}</FormMessage>
                    </FormItem>
                  )}
                />
              </div>
              {serverError && <p className="text-destructive text-sm">{serverError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setSheetOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={saveMut.isPending}>
                  {saveMut.isPending ? t('common.saving') : t('common.save')}
                </Button>
              </div>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      <Dialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('pro.services.deleteConfirmTitle')}</DialogTitle>
            <DialogDescription>{t('pro.services.deleteConfirmBody')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingDelete(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => pendingDelete && deleteMut.mutate(pendingDelete.id)}
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
