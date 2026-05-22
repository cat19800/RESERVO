'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { profileUpdateSchema, type ProfileUpdateInput, type ProfileResponse } from '@/schemas/profile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { type ApiResult, isFailure } from '@/types/api';

async function getProfile(): Promise<ProfileResponse> {
  const res = await fetch('/api/me/profile', { credentials: 'include' });
  const json = (await res.json()) as ApiResult<ProfileResponse>;
  if (isFailure(json)) throw new Error(json.error.code);
  return json.data;
}

async function updateProfile(input: ProfileUpdateInput): Promise<ProfileResponse> {
  const res = await fetch('/api/me/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });
  const json = (await res.json()) as ApiResult<ProfileResponse>;
  if (isFailure(json)) throw new Error(json.error.code);
  return json.data;
}

export function ProfileForm() {
  const t = useTranslations();
  const qc = useQueryClient();
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['me', 'profile'],
    queryFn: getProfile,
  });

  const form = useForm<ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      city: '',
      address: '',
      bio: '',
    },
  });

  useEffect(() => {
    if (data) {
      form.reset({
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone ?? '',
        city: data.city ?? '',
        address: data.address ?? '',
        bio: data.bio ?? '',
      });
    }
  }, [data, form]);

  const mutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: async (next) => {
      qc.setQueryData(['me', 'profile'], next);
      await qc.invalidateQueries({ queryKey: ['auth', 'me'] });
      setSavedAt(Date.now());
    },
  });

  function tFieldError(key?: string): string | undefined {
    if (!key) return undefined;
    if (key.startsWith('auth.errors.')) return t(key as 'auth.errors.passwordTooShort');
    return key;
  }

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">{t('common.loading')}</p>;
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        className="grid gap-5"
      >
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>{t('common.firstName')}</FormLabel>
                <FormControl>
                  <Input autoComplete="given-name" {...field} />
                </FormControl>
                <FormMessage>{tFieldError(fieldState.error?.message)}</FormMessage>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>{t('common.lastName')}</FormLabel>
                <FormControl>
                  <Input autoComplete="family-name" {...field} />
                </FormControl>
                <FormMessage>{tFieldError(fieldState.error?.message)}</FormMessage>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('common.phone')}{' '}
                <span className="text-muted-foreground text-xs font-normal">
                  ({t('common.optional')})
                </span>
              </FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
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

        <FormField
          control={form.control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('common.city')}{' '}
                <span className="text-muted-foreground text-xs font-normal">
                  ({t('common.optional')})
                </span>
              </FormLabel>
              <FormControl>
                <Input
                  autoComplete="address-level2"
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

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('common.address')}{' '}
                <span className="text-muted-foreground text-xs font-normal">
                  ({t('common.optional')})
                </span>
              </FormLabel>
              <FormControl>
                <Input
                  autoComplete="street-address"
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

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('common.bio')}{' '}
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
              <FormDescription>{500 - (field.value?.length ?? 0)} / 500</FormDescription>
            </FormItem>
          )}
        />

        <div className="flex items-center justify-between gap-3 pt-2">
          {mutation.isError && (
            <p className="text-destructive text-sm">{t('auth.errors.INTERNAL_ERROR')}</p>
          )}
          {savedAt && !mutation.isPending && !mutation.isError && (
            <p className="text-accent text-sm">{t('settings.profile.saveSuccess')}</p>
          )}
          <Button type="submit" disabled={mutation.isPending} className="ml-auto">
            {mutation.isPending ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </form>
    </Form>
  );
}
