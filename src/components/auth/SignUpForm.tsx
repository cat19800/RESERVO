'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { signUpSchema, type SignUpInput } from '@/schemas/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { type ApiResult } from '@/types/api';

export function SignUpForm({ locale }: { locale: string }) {
  const t = useTranslations();
  const router = useRouter();
  const qc = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      acceptTerms: false,
    },
  });

  async function onSubmit(values: SignUpInput) {
    setServerError(null);
    const res = await fetch('/api/auth/sign-up', {
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

  function tFieldError(key: string | undefined): string | undefined {
    if (!key) return undefined;
    if (key.startsWith('auth.errors.')) {
      return t(key as 'auth.errors.passwordTooShort');
    }
    return key;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
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
          name="email"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>{t('common.email')}</FormLabel>
              <FormControl>
                <Input type="email" autoComplete="email" inputMode="email" {...field} />
              </FormControl>
              <FormMessage>{tFieldError(fieldState.error?.message)}</FormMessage>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>{t('common.password')}</FormLabel>
              <FormControl>
                <Input type="password" autoComplete="new-password" {...field} />
              </FormControl>
              <FormMessage>{tFieldError(fieldState.error?.message)}</FormMessage>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="acceptTerms"
          render={({ field, fieldState }) => (
            <FormItem className="flex flex-row items-start gap-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(v) => field.onChange(v === true)}
                />
              </FormControl>
              <div className="grid gap-1 leading-tight">
                <FormLabel className="text-sm font-normal">
                  {t('auth.signUp.acceptTerms')}
                </FormLabel>
                <FormMessage>{tFieldError(fieldState.error?.message)}</FormMessage>
              </div>
            </FormItem>
          )}
        />
        {serverError && <p className="text-destructive text-sm">{serverError}</p>}
        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
          {form.formState.isSubmitting ? t('common.loading') : t('auth.signUp.submit')}
        </Button>
      </form>
    </Form>
  );
}
