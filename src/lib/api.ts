import { NextResponse } from 'next/server';
import { z } from 'zod';

export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
    public details?: unknown,
  ) {
    super(code);
  }
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function fail(error: ApiError) {
  return NextResponse.json(
    { error: { code: error.code, message: error.message, details: error.details } },
    { status: error.status },
  );
}

/** Wrap a route handler so thrown ApiErrors / zod errors become consistent responses. */
export function handle<TArgs extends unknown[]>(
  fn: (...args: TArgs) => Promise<NextResponse | Response>,
): (...args: TArgs) => Promise<NextResponse | Response> {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof ApiError) return fail(e);
      if (e instanceof z.ZodError) {
        return fail(new ApiError('VALIDATION_ERROR', 400, z.treeifyError(e)));
      }
      console.error(e);
      return fail(new ApiError('INTERNAL_ERROR', 500));
    }
  };
}
