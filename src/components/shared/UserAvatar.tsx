import { createAvatar } from '@dicebear/core';
import { initials } from '@dicebear/collection';
import { cn } from '@/lib/utils';

type Props = {
  seed: string;
  /** Used as the deterministic display string when seed is e.g. an email. */
  displayName?: string;
  size?: number;
  className?: string;
};

const SKY_PALETTE = ['0284C7', '0EA5E9', '38BDF8', '059669', '10B981'];

export function UserAvatar({ seed, displayName, size = 36, className }: Props) {
  // Use displayName for the rendered initials when available; otherwise let
  // dicebear derive initials from the seed itself.
  const svg = createAvatar(initials, {
    seed: displayName ?? seed,
    backgroundColor: SKY_PALETTE,
    fontFamily: ['Inter', 'system-ui', 'sans-serif'],
    fontWeight: 600,
    radius: 50,
  }).toString();

  return (
    <span
      aria-hidden
      className={cn('inline-block overflow-hidden rounded-full', className)}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
