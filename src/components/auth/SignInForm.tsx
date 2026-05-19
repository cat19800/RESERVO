'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { signInSchema, type SignInInput } from '@/schemas/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { type ApiResult } from '@/types/api';

export function SignInForm({ locale }: { locale: string }) {
  const t = useTranslations();
  const router = useRouter();
  const qc = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: SignInInput) {
    setServerError(null);
    const res = await fetch('/api/auth/sign-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
      credentials: 'include',
    });
    const json = (await res.json()) as ApiResult<unknown>;
    if (!res.ok || 'error' in json) {
      const code = 'error' in json ? json.error.code : 'INTERNAL_ERROR';
      setServerError(t(`auth.errors.${code}` as 'auth.errors.INTERNAL_ERROR'));
      return;
    }
    await qc.invalidateQueries({ queryKey: ['auth', 'me'] });
    router.push(`/${locale}/home`);
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('common.email')}</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  autoFocus
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('common.password')}</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="current-password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {serverError && <p className="text-destructive text-sm">{serverError}</p>}
        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
          {form.formState.isSubmitting ? t('common.loading') : t('auth.signIn.submit')}
        </Button>
      </form>
    </Form>
  );
}
