import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

export function PriceTag({ value, className }) {
  return <span className={cn('font-semibold tabular-nums', className)}>{formatCurrency(value)}</span>;
}
