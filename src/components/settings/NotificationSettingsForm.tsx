'use client';

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import {
  notificationSettingsUpdateSchema,
  type NotificationSettingsResponse,
  type NotificationSettingsUpdateInput,
} from '@/schemas/notification-settings';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { type ApiResult, isFailure } from '@/types/api';

async function getSettings(): Promise<NotificationSettingsResponse> {
  const res = await fetch('/api/me/notification-settings', { credentials: 'include' });
  const json = (await res.json()) as ApiResult<NotificationSettingsResponse>;
  if (isFailure(json)) throw new Error(json.error.code);
  return json.data;
}

async function updateSettings(
  input: NotificationSettingsUpdateInput,
): Promise<NotificationSettingsResponse> {
  const res = await fetch('/api/me/notification-settings', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });
  const json = (await res.json()) as ApiResult<NotificationSettingsResponse>;
  if (isFailure(json)) throw new Error(json.error.code);
  return json.data;
}

type Channel = 'inAppEnabled' | 'emailEnabled' | 'smsEnabled' | 'pushEnabled';
const CHANNELS: { name: Channel; labelKey: string; helperKey: string }[] = [
  { name: 'inAppEnabled', labelKey: 'settings.notifications.inApp', helperKey: 'settings.notifications.inAppHelper' },
  { name: 'emailEnabled', labelKey: 'settings.notifications.email', helperKey: 'settings.notifications.emailHelper' },
  { name: 'smsEnabled', labelKey: 'settings.notifications.sms', helperKey: 'settings.notifications.smsHelper' },
  { name: 'pushEnabled', labelKey: 'settings.notifications.push', helperKey: 'settings.notifications.pushHelper' },
];

export function NotificationSettingsForm() {
  const t = useTranslations();
  const qc = useQueryClient();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['me', 'notificationSettings'],
    queryFn: getSettings,
  });

  const form = useForm<NotificationSettingsUpdateInput>({
    resolver: zodResolver(notificationSettingsUpdateSchema),
    defaultValues: {
      inAppEnabled: true,
      emailEnabled: true,
      smsEnabled: true,
      pushEnabled: true,
      reminderHours: 24,
    },
  });

  useEffect(() => {
    if (data) form.reset(data);
  }, [data, form]);

  const mutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: (next) => {
      qc.setQueryData(['me', 'notificationSettings'], next);
      setSavedAt(Date.now());
    },
  });

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">{t('common.loading')}</p>;
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        className="grid gap-5"
      >
        <div className="grid gap-3">
          {CHANNELS.map((c) => (
            <Controller
              key={c.name}
              control={form.control}
              name={c.name}
              render={({ field }) => (
                <label
                  htmlFor={c.name}
                  className="border-border bg-card flex items-start gap-3 rounded-xl border p-3"
                >
                  <Switch
                    id={c.name}
                    checked={field.value === true}
                    onCheckedChange={field.onChange}
                    className="mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-none">
                      {t(c.labelKey as 'settings.notifications.inApp')}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {t(c.helperKey as 'settings.notifications.inAppHelper')}
                    </p>
                  </div>
                </label>
              )}
            />
          ))}
        </div>

        <FormField
          control={form.control}
          name="reminderHours"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>{t('settings.notifications.reminderHours')}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={72}
                  value={field.value ?? 24}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormDescription>1–72</FormDescription>
              <FormMessage>{fieldState.error?.message}</FormMessage>
            </FormItem>
          )}
        />

        <div className="flex items-center justify-between gap-3 pt-2">
          {mutation.isError && (
            <p className="text-destructive text-sm">{t('auth.errors.INTERNAL_ERROR')}</p>
          )}
          {savedAt && !mutation.isPending && !mutation.isError && (
            <p className="text-accent text-sm">{t('settings.notifications.saveSuccess')}</p>
          )}
          <Button type="submit" disabled={mutation.isPending} className="ml-auto">
            {mutation.isPending ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
