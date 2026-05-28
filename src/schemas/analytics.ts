export type AnalyticsResponseDto = {
  revenueCents: {
    last30Days: number;
    lifetime: number;
  };
  cancellationRate: {
    cancelled: number;
    total: number; // confirmed + completed + cancelled
    rate: number; // 0..1, or 0 when total === 0
  };
  bookingsByMonth: Array<{
    month: string; // 'YYYY-MM'
    count: number;
  }>;
  topServices: Array<{
    serviceId: string;
    serviceName: string;
    count: number;
    revenueCents: number;
  }>;
  totals: {
    confirmed: number;
    completed: number;
    cancelled: number;
  };
};
