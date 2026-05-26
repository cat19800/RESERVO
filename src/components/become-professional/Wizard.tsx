'use client';

import { useState } from 'react';
import { useForm, Controller, type Control, type FieldPath } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronLeft } from 'lucide-react';

import {
  becomeProfessionalSchema,
  CATEGORIES,
  type BecomeProfessionalInput,
  type BecomeProfessionalResponse,
} from '@/schemas/become-professional';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { cn } from '@/lib/utils';

const TOTAL_STEPS = 4;

const STEP_FIELDS: ReadonlyArray<ReadonlyArray<FieldPath<BecomeProfessionalInput>>> = [
  ['displayName', 'category', 'specialty', 'description', 'city', 'address', 'companyName'],
  ['serviceName', 'serviceDurationMinutes', 'servicePriceCents', 'serviceDescription'],
  ['workingDays', 'startTime', 'endTime'],
  ['plan'],
];

const PRESETS = {
  monFri: { workingDays: [1, 2, 3, 4, 5], startTime: '09:00', endTime: '17:00' },
  monSat: { workingDays: [1, 2, 3, 4, 5, 6], startTime: '10:00', endTime: '18:00' },
} as const;

type WizardErrorKey =
  | 'becomeProfessional.errors.ALREADY_A_PROFESSIONAL'
  | 'becomeProfessional.errors.COMPANY_NAME_TAKEN'
  | 'auth.errors.INTERNAL_ERROR';

async function submitWizard(input: BecomeProfessionalInput): Promise<BecomeProfessionalResponse> {
  const res = await fetch('/api/become-professional', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });
  const json = (await res.json()) as ApiResult<BecomeProfessionalResponse>;
  if (isFailure(json)) throw new Error(json.error.code);
  return json.data;
}

export function Wizard({ locale }: { locale: string }) {
  const t = useTranslations();
  const router = useRouter();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<BecomeProfessionalInput>({
    resolver: zodResolver(becomeProfessionalSchema),
    mode: 'onTouched',
    defaultValues: {
      displayName: '',
      category: 'DOCTOR',
      specialty: '',
      description: '',
      city: '',
      address: '',
      companyName: '',
      serviceName: '',
      serviceDurationMinutes: 30,
      servicePriceCents: 0,
      serviceDescription: '',
      workingDays: [1, 2, 3, 4, 5],
      startTime: '09:00',
      endTime: '17:00',
      plan: 'free',
    },
  });

  // Pin the control's generic so the dozens of <FormField> usages below
  // don't each redo expensive structural inference (which trips TS at scale).
  const control = form.control as Control<BecomeProfessionalInput>;

  const mutation = useMutation({
    mutationFn: submitWizard,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['auth', 'me'] });
      router.push(`/${locale}/pro/dashboard`);
      router.refresh();
    },
    onError: (e: Error) => {
      const code = e.message;
      if (code === 'ALREADY_A_PROFESSIONAL' || code === 'COMPANY_NAME_TAKEN') {
        setServerError(t(`becomeProfessional.errors.${code}` as WizardErrorKey));
      } else {
        setServerError(t('auth.errors.INTERNAL_ERROR'));
      }
    },
  });

  function tFieldError(key?: string) {
    if (!key) return undefined;
    if (key.startsWith('becomeProfessional.errors.') || key.startsWith('auth.errors.')) {
      return t(key as 'becomeProfessional.errors.displayNameRequired');
    }
    return key;
  }

  async function next() {
    setServerError(null);
    const ok = await form.trigger(STEP_FIELDS[step] as FieldPath<BecomeProfessionalInput>[]);
    if (!ok) return;

    // Cross-field check on the schedule step — replicates the server-side refine.
    if (step === 2) {
      const v = form.getValues();
      if (v.startTime >= v.endTime) {
        form.setError('endTime', {
          message: 'becomeProfessional.errors.endBeforeStart',
        });
        return;
      }
    }

    if (step < TOTAL_STEPS - 1) setStep(step + 1);
    else mutation.mutate(form.getValues());
  }

  function back() {
    setServerError(null);
    if (step > 0) setStep(step - 1);
  }

  const stepKeys = ['business', 'service', 'schedule', 'plan'] as const;
  const stepKey = stepKeys[step];

  return (
    <div className="grid gap-6">
      {/* Progress */}
      <div className="flex items-center gap-2" aria-label={t('becomeProfessional.title')}>
        {stepKeys.map((k, i) => (
          <div key={k} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                i < step
                  ? 'bg-primary text-primary-foreground'
                  : i === step
                    ? 'bg-primary text-primary-foreground ring-primary/20 ring-4'
                    : 'bg-muted text-muted-foreground',
              )}
            >
              {i < step ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}
            </span>
            {i < stepKeys.length - 1 && (
              <span
                className={cn(
                  'h-0.5 flex-1 rounded',
                  i < step ? 'bg-primary' : 'bg-muted',
                )}
                aria-hidden
              />
            )}
          </div>
        ))}
      </div>
      <p className="text-muted-foreground -mt-3 text-xs">
        {t('becomeProfessional.stepOf', { current: step + 1, total: TOTAL_STEPS })} ·{' '}
        {t(`becomeProfessional.steps.${stepKey}`)}
      </p>

      <Form {...form}>
        {/* Step 1 — business */}
        {step === 0 && (
          <div className="grid gap-4">
            <header>
              <h2 className="text-xl font-semibold tracking-tight">
                {t('becomeProfessional.business.title')}
              </h2>
              <p className="text-muted-foreground text-sm">
                {t('becomeProfessional.business.subtitle')}
              </p>
            </header>

            <FormField
              control={control}
              name="displayName"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>{t('becomeProfessional.business.displayName')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormDescription>
                    {t('becomeProfessional.business.displayNameHelper')}
                  </FormDescription>
                  <FormMessage>{tFieldError(fieldState.error?.message)}</FormMessage>
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('becomeProfessional.business.category')}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {t(`categories.${c}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="specialty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('becomeProfessional.business.specialty')}{' '}
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

            <FormField
              control={control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('becomeProfessional.business.description')}{' '}
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
                control={control}
                name="city"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>{t('becomeProfessional.business.city')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage>{tFieldError(fieldState.error?.message)}</FormMessage>
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="address"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>{t('becomeProfessional.business.address')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage>{tFieldError(fieldState.error?.message)}</FormMessage>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('becomeProfessional.business.companyName')}{' '}
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
                  <FormDescription>
                    {t('becomeProfessional.business.companyHelper')}
                  </FormDescription>
                </FormItem>
              )}
            />
          </div>
        )}

        {/* Step 2 — service */}
        {step === 1 && (
          <div className="grid gap-4">
            <header>
              <h2 className="text-xl font-semibold tracking-tight">
                {t('becomeProfessional.service.title')}
              </h2>
              <p className="text-muted-foreground text-sm">
                {t('becomeProfessional.service.subtitle')}
              </p>
            </header>

            <FormField
              control={control}
              name="serviceName"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>{t('becomeProfessional.service.name')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage>{tFieldError(fieldState.error?.message)}</FormMessage>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={control}
                name="serviceDurationMinutes"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>{t('becomeProfessional.service.duration')}</FormLabel>
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
                control={control}
                name="servicePriceCents"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>{t('becomeProfessional.service.price')}</FormLabel>
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

            <FormField
              control={control}
              name="serviceDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('becomeProfessional.service.description')}{' '}
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
          </div>
        )}

        {/* Step 3 — schedule */}
        {step === 2 && (
          <div className="grid gap-4">
            <header>
              <h2 className="text-xl font-semibold tracking-tight">
                {t('becomeProfessional.schedule.title')}
              </h2>
              <p className="text-muted-foreground text-sm">
                {t('becomeProfessional.schedule.subtitle')}
              </p>
            </header>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  form.setValue('workingDays', [...PRESETS.monFri.workingDays]);
                  form.setValue('startTime', PRESETS.monFri.startTime);
                  form.setValue('endTime', PRESETS.monFri.endTime);
                }}
              >
                {t('becomeProfessional.schedule.presetMonFri')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  form.setValue('workingDays', [...PRESETS.monSat.workingDays]);
                  form.setValue('startTime', PRESETS.monSat.startTime);
                  form.setValue('endTime', PRESETS.monSat.endTime);
                }}
              >
                {t('becomeProfessional.schedule.presetMonSat')}
              </Button>
            </div>

            <Controller
              control={control}
              name="workingDays"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>{t('becomeProfessional.schedule.days')}</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                      const active = field.value?.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => {
                            const set = new Set(field.value ?? []);
                            if (set.has(day)) set.delete(day);
                            else set.add(day);
                            field.onChange(Array.from(set).sort());
                          }}
                          className={cn(
                            'h-10 w-10 rounded-full border text-sm font-medium transition',
                            active
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'border-border bg-card hover:bg-muted',
                          )}
                          aria-pressed={active}
                        >
                          {t(`days.${day}` as 'days.0')}
                        </button>
                      );
                    })}
                  </div>
                  <FormMessage>{tFieldError(fieldState.error?.message)}</FormMessage>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={control}
                name="startTime"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>{t('becomeProfessional.schedule.startTime')}</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage>{tFieldError(fieldState.error?.message)}</FormMessage>
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="endTime"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>{t('becomeProfessional.schedule.endTime')}</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage>{tFieldError(fieldState.error?.message)}</FormMessage>
                  </FormItem>
                )}
              />
            </div>
          </div>
        )}

        {/* Step 4 — plan */}
        {step === 3 && (
          <div className="grid gap-4">
            <header>
              <h2 className="text-xl font-semibold tracking-tight">
                {t('becomeProfessional.plan.title')}
              </h2>
              <p className="text-muted-foreground text-sm">
                {t('becomeProfessional.plan.subtitle')}
              </p>
            </header>

            <Controller
              control={control}
              name="plan"
              render={({ field }) => (
                <div className="grid gap-3">
                  <button
                    type="button"
                    onClick={() => field.onChange('free')}
                    className={cn(
                      'rounded-2xl border p-4 text-left transition',
                      field.value === 'free'
                        ? 'border-primary ring-primary/20 ring-2'
                        : 'border-border hover:border-primary/40',
                    )}
                    aria-pressed={field.value === 'free'}
                  >
                    <p className="text-base font-semibold">{t('becomeProfessional.plan.free')}</p>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {t('becomeProfessional.plan.freeDescription')}
                    </p>
                  </button>
                  <button
                    type="button"
                    disabled
                    className="border-border rounded-2xl border p-4 text-left opacity-60"
                    aria-disabled
                  >
                    <p className="text-base font-semibold">
                      {t('becomeProfessional.plan.premium')}
                    </p>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {t('becomeProfessional.plan.premiumDescription')}
                    </p>
                    <p className="text-muted-foreground mt-2 text-xs italic">
                      {t('becomeProfessional.plan.premiumComingSoon')}
                    </p>
                  </button>
                </div>
              )}
            />
          </div>
        )}

        {serverError && <p className="text-destructive text-sm">{serverError}</p>}

        {/* Nav buttons */}
        <div className="flex items-center justify-between gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={back} disabled={step === 0}>
            <ChevronLeft className="mr-1 h-4 w-4" aria-hidden />
            {t('common.back')}
          </Button>
          <Button type="button" onClick={next} disabled={mutation.isPending}>
            {mutation.isPending
              ? t('common.loading')
              : step === TOTAL_STEPS - 1
                ? t('becomeProfessional.submit')
                : t('common.next')}
          </Button>
        </div>
      </Form>
    </div>
  );
}
