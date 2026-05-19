'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { buttonVariants } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserAvatar } from '@/components/shared/UserAvatar';
import { useSession } from '@/hooks/useSession';
import { cn } from '@/lib/utils';

export function UserMenu({ locale }: { locale: string }) {
  const t = useTranslations();
  const router = useRouter();
  const qc = useQueryClient();
  const { data: user, isLoading } = useSession();

  if (isLoading) {
    return <div className="bg-muted h-9 w-9 animate-pulse rounded-full" aria-hidden />;
  }

  if (!user) {
    return (
      <div className="flex gap-2">
        <Link
          href={`/${locale}/sign-in`}
          className={buttonVariants({ variant: 'ghost', size: 'sm' })}
        >
          {t('common.signIn')}
        </Link>
        <Link
          href={`/${locale}/sign-up`}
          className={buttonVariants({ variant: 'default', size: 'sm' })}
        >
          {t('common.signUp')}
        </Link>
      </div>
    );
  }

  async function signOut() {
    await fetch('/api/auth/sign-out', { method: 'POST', credentials: 'include' });
    await qc.invalidateQueries({ queryKey: ['auth', 'me'] });
    router.push(`/${locale}/sign-in`);
    router.refresh();
  }

  const fullName = user.profile && `${user.profile.firstName} ${user.profile.lastName}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={user.email}
        className={cn(
          'rounded-full',
          'focus-visible:ring-ring focus-visible:ring-offset-background focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
        )}
      >
        <UserAvatar
          seed={user.profile?.avatarSeed ?? user.email}
          displayName={fullName ?? user.email}
          size={36}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="grid gap-0.5">
          {user.profile && (
            <span className="text-sm font-medium">
              {user.profile.firstName} {user.profile.lastName}
            </span>
          )}
          <span className="text-muted-foreground truncate text-xs font-normal">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push(`/${locale}/home`)}>
          {t('shell.menu.home')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push(`/${locale}/appointments`)}>
          {t('shell.menu.appointments')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => router.push(`/${locale}/reviews`)}>
          {t('shell.menu.reviews')}
        </DropdownMenuItem>
        {user.professionalId ? (
          <DropdownMenuItem onClick={() => router.push(`/${locale}/pro/dashboard`)}>
            {t('shell.menu.proDashboard')}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => router.push(`/${locale}/become-professional`)}>
            {t('shell.menu.becomeProfessional')}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => router.push(`/${locale}/settings`)}>
          {t('shell.menu.settings')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} variant="destructive">
          {t('common.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
