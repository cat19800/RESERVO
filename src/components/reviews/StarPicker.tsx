'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  value: number;
  onChange: (value: number) => void;
  size?: number;
  /** When true, hovering doesn't preview a different value (for read-only display). */
  readOnly?: boolean;
  ariaLabel?: string;
};

export function StarPicker({ value, onChange, size = 28, readOnly, ariaLabel }: Props) {
  return (
    <div
      role={readOnly ? 'img' : 'radiogroup'}
      aria-label={ariaLabel}
      className="inline-flex items-center gap-1"
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        return (
          <button
            key={n}
            type="button"
            disabled={readOnly}
            onClick={() => onChange(n)}
            aria-checked={n === value}
            role={readOnly ? undefined : 'radio'}
            className={cn(
              'rounded-md transition-transform',
              !readOnly && 'hover:scale-110 active:scale-95',
              !readOnly && 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              readOnly && 'cursor-default',
            )}
          >
            <Star
              className={filled ? 'text-amber-500' : 'text-muted-foreground/40'}
              fill={filled ? 'currentColor' : 'none'}
              style={{ width: size, height: size }}
              strokeWidth={1.5}
              aria-hidden
            />
          </button>
        );
      })}
    </div>
  );
}
