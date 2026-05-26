'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { reviewWriteSchema, type ReviewWriteInput } from '@/schemas/review';
import { type ApiResult, isFailure } from '@/types/api';
import { StarPicker } from './StarPicker';

type Mode = 'create' | 'edit';

type ReviewErrorKey =
  | 'reviews.errors.INAPPROPRIATE_CONTENT'
  | 'reviews.errors.NOT_ELIGIBLE'
  | 'reviews.errors.ALREADY_REVIEWED'
  | 'reviews.errors.invalidRating';

async function submitReview(
  appointmentId: string,
  input: ReviewWriteInput,
  mode: Mode,
): Promise<void> {
  const res = await fetch(`/api/appointments/${appointmentId}/review`, {
    method: mode === 'create' ? 'POST' : 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });
  const json = (await res.json()) as ApiResult<unknown>;
  if (isFailure(json)) throw new Error(json.error.code);
}

export function ReviewForm({
  appointmentId,
  locale,
  mode,
  initial,
}: {
  appointmentId: string;
  locale: string;
  mode: Mode;
  initial?: { rating: number; comment: string | null };
}) {
  const t = useTranslations();
  const router = useRouter();
  const qc = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<ReviewWriteInput>({
    resolver: zodResolver(reviewWriteSchema),
    defaultValues: {
      rating: initial?.rating ?? 0,
      comment: initial?.comment ?? '',
    },
  });

  const mutation = useMutation({
    mutationFn: (values: ReviewWriteInput) => submitReview(appointmentId, values, mode),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['customer', 'reviews'] });
      await qc.invalidateQueries({ queryKey: ['customer', 'appointments'] });
      router.push(`/${locale}/appointments/${appointmentId}?reviewed=1`);
      router.refresh();
    },
    onError: (e: Error) => {
      const code = e.message;
      if (
        code === 'INAPPROPRIATE_CONTENT' ||
        code === 'NOT_ELIGIBLE' ||
        code === 'ALREADY_REVIEWED'
      ) {
        setServerError(t(`reviews.errors.${code}` as ReviewErrorKey));
      } else {
        setServerError(t('auth.errors.INTERNAL_ERROR'));
      }
    },
  });

  function tFieldError(key?: string) {
    if (!key) return undefined;
    if (key.startsWith('reviews.errors.')) return t(key as ReviewErrorKey);
    return key;
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => {
          setServerError(null);
          mutation.mutate(values);
        })}
        className="grid gap-5"
      >
        <Controller
          control={form.control}
          name="rating"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>{t('reviews.ratingLabel')}</FormLabel>
              <FormControl>
                <StarPicker
                  value={field.value}
                  onChange={(v) => field.onChange(v)}
                  ariaLabel={t('reviews.ratingLabel')}
                />
              </FormControl>
              <FormDescription>{t('reviews.ratingHelper')}</FormDescription>
              <FormMessage>{tFieldError(fieldState.error?.message)}</FormMessage>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="comment"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('reviews.commentLabel')}{' '}
                <span className="text-muted-foreground text-xs font-normal">
                  {t('reviews.commentOptional')}
                </span>
              </FormLabel>
              <FormControl>
                <Textarea
                  rows={4}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                  maxLength={1000}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {serverError && <p className="text-destructive text-sm">{serverError}</p>}

        <div className="flex justify-end">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending
              ? t('common.saving')
              : mode === 'create'
                ? t('reviews.submit')
                : t('reviews.saveChanges')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
