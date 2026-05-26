'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
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
import {
  cancellationRulesUpdateSchema,
  type CancellationRulesResponse,
  type CancellationRulesUpdateInput,
} from '@/schemas/cancellation';
import { type ApiResult, isFailure } from '@/types/api';

async function getRules(): Promise<CancellationRulesResponse> {
  const res = await fetch('/api/professionals/me/cancellation-rules', { credentials: 'include' });
  const json = (await res.json()) as ApiResult<CancellationRulesResponse>;
  if (isFailure(json)) throw new Error(json.error.code);
  return json.data;
}

async function putRules(input: CancellationRulesUpdateInput): Promise<CancellationRulesResponse> {
  const res = await fetch('/api/professionals/me/cancellation-rules', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });
  const json = (await res.json()) as ApiResult<CancellationRulesResponse>;
  if (isFailure(json)) throw new Error(json.error.code);
  return json.data;
}

export function CancellationRulesForm() {
  const t = useTranslations();
  const qc = useQueryClient();
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [snapshot, setSnapshot] = useState<CancellationRulesResponse | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['pro', 'cancellationRules'],
    queryFn: getRules,
  });

  const form = useForm<CancellationRulesUpdateInput>({
    resolver: zodResolver(cancellationRulesUpdateSchema),
    defaultValues: { deadlineHours: 24 },
  });

  // Snapshot-on-render: re-sync form when fresh data arrives.
  if (data && data !== snapshot) {
    setSnapshot(data);
    form.reset(data);
  }

  const mutation = useMutation({
    mutationFn: putRules,
    onSuccess: (next) => {
      qc.setQueryData(['pro', 'cancellationRules'], next);
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
        className="grid gap-4"
      >
        <FormField
          control={form.control}
          name="deadlineHours"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>{t('proSettings.cancellationRules.deadlineLabel')}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={168}
                  value={field.value ?? 24}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormDescription>{t('proSettings.cancellationRules.deadlineHelper')}</FormDescription>
              <FormMessage>
                {fieldState.error?.message
                  ? t('proSettings.cancellationRules.errors.invalid')
                  : null}
              </FormMessage>
            </FormItem>
          )}
        />

        <div className="flex items-center justify-between gap-3 pt-2">
          {mutation.isError && (
            <p className="text-destructive text-sm">{t('auth.errors.INTERNAL_ERROR')}</p>
          )}
          {savedAt && !mutation.isPending && !mutation.isError && (
            <p className="text-accent text-sm">{t('proSettings.cancellationRules.saved')}</p>
          )}
          <Button type="submit" disabled={mutation.isPending} className="ml-auto">
            {mutation.isPending ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
