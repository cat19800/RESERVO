export type ApiSuccess<T> = { data: T };

export type ApiFailure = {
  error: { code: string; message?: string; details?: unknown };
};

export type ApiResult<T> = ApiSuccess<T> | ApiFailure;

export function isFailure<T>(r: ApiResult<T>): r is ApiFailure {
  return 'error' in r;
}

export type SessionUserDto = {
  id: string;
  email: string;
  profile: { firstName: string; lastName: string; avatarSeed: string } | null;
  customerId: string | null;
  professionalId: string | null;
};
