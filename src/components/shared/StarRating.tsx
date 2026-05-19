import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  value: number;
  count?: number;
  size?: number;
  className?: string;
};

export function StarRating({ value, count, size = 14, className }: Props) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs', className)}>
      <Star
        className="text-amber-500"
        style={{ width: size, height: size }}
        fill="currentColor"
        aria-hidden
      />
      <span className="text-foreground font-medium">{value.toFixed(1)}</span>
      {count !== undefined && (
        <span className="text-muted-foreground">({count})</span>
      )}
    </span>
  );
}
