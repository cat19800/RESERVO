'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TrendingUp, Wallet, XCircle, CalendarCheck2 } from 'lucide-react';

import { type ApiResult, isFailure } from '@/types/api';
import { type AnalyticsResponseDto } from '@/schemas/analytics';
import { cn } from '@/lib/utils';

const KEY = ['analytics'] as const;

async function fetchAnalytics(): Promise<AnalyticsResponseDto> {
  const res = await fetch('/api/professionals/me/analytics', {
    credentials: 'include',
  });
  const json = (await res.json()) as ApiResult<AnalyticsResponseDto>;
  if (isFailure(json)) throw new Error(json.error.code);
  return json.data;
}

export function AnalyticsDashboard() {
  const t = useTranslations();
  const fmt = useFormatter();
  const { data, isLoading, error } = useQuery({
    queryKey: KEY,
    queryFn: fetchAnalytics,
  });

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">{t('pro.analytics.loading')}</p>;
  }
  if (error || !data) {
    return <p className="text-destructive text-sm">{t('pro.analytics.error')}</p>;
  }

  const totalVisible =
    data.totals.confirmed + data.totals.completed + data.totals.cancelled;
  if (totalVisible === 0) {
    return (
      <div className="border-border bg-muted/30 rounded-2xl border border-dashed p-6 text-center">
        <p className="text-muted-foreground text-sm">{t('pro.analytics.empty')}</p>
      </div>
    );
  }

  const fmtMoney = (cents: number) =>
    fmt.number(cents / 100, { style: 'currency', currency: 'EUR' });
  const fmtPercent = (rate: number) =>
    fmt.number(rate, { style: 'percent', maximumFractionDigits: 1 });

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3">
        <KpiCard
          icon={Wallet}
          label={t('pro.analytics.kpis.revenue30d')}
          value={fmtMoney(data.revenueCents.last30Days)}
          tone="primary"
        />
        <KpiCard
          icon={TrendingUp}
          label={t('pro.analytics.kpis.revenueLifetime')}
          value={fmtMoney(data.revenueCents.lifetime)}
        />
        <KpiCard
          icon={CalendarCheck2}
          label={t('pro.analytics.kpis.totalCompleted')}
          value={String(data.totals.completed)}
        />
        <KpiCard
          icon={XCircle}
          label={t('pro.analytics.kpis.cancellationRate')}
          value={fmtPercent(data.cancellationRate.rate)}
          tone={data.cancellationRate.rate >= 0.2 ? 'destructive' : undefined}
        />
      </div>

      <ChartCard
        title={t('pro.analytics.bookingsByMonth.title')}
        subtitle={t('pro.analytics.bookingsByMonth.subtitle')}
      >
        <ResponsiveContainer width="100%" height={220}>
          <LineChart
            data={data.bookingsByMonth.map((m) => ({
              month: shortMonthLabel(m.month, fmt),
              count: m.count,
            }))}
            margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
          >
            <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              fontSize={11}
              stroke="hsl(var(--muted-foreground))"
            />
            <YAxis
              allowDecimals={false}
              fontSize={11}
              stroke="hsl(var(--muted-foreground))"
              label={{
                value: t('pro.analytics.bookingsByMonth.yLabel'),
                angle: -90,
                position: 'insideLeft',
                fontSize: 11,
                style: { fill: 'hsl(var(--muted-foreground))' },
              }}
            />
            <Tooltip
              contentStyle={{
                background: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard
        title={t('pro.analytics.topServices.title')}
        subtitle={t('pro.analytics.topServices.subtitle')}
      >
        {data.topServices.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {t('pro.analytics.topServices.empty')}
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={data.topServices.map((s) => ({
                name: s.serviceName,
                count: s.count,
              }))}
              layout="vertical"
              margin={{ top: 8, right: 16, bottom: 0, left: 8 }}
            >
              <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis
                type="number"
                allowDecimals={false}
                fontSize={11}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis
                dataKey="name"
                type="category"
                width={120}
                fontSize={11}
                stroke="hsl(var(--muted-foreground))"
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar
                dataKey="count"
                fill="hsl(var(--primary))"
                radius={[0, 6, 6, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  tone?: 'primary' | 'destructive';
}) {
  return (
    <div className="border-border bg-card grid gap-2 rounded-2xl border p-4 shadow-sm">
      <div
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-xl',
          tone === 'destructive'
            ? 'bg-destructive/10 text-destructive'
            : tone === 'primary'
              ? 'bg-primary/10 text-primary'
              : 'bg-muted text-muted-foreground',
        )}
      >
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <p className="text-muted-foreground text-[11px] uppercase tracking-wide">{label}</p>
      <p className="text-lg font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-border bg-card grid gap-3 rounded-2xl border p-4 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        <p className="text-muted-foreground text-xs">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function shortMonthLabel(
  yearMonth: string,
  fmt: ReturnType<typeof useFormatter>,
): string {
  const [y, m] = yearMonth.split('-');
  const d = new Date(Date.UTC(Number(y), Number(m) - 1, 1));
  return fmt.dateTime(d, { month: 'short', year: '2-digit' });
}
