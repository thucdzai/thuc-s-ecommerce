import { Badge } from '@/components/ui/badge';
import {
  ORDER_STATUS_LABEL,
  ORDER_STATUS_VARIANT,
  PAYMENT_STATUS_LABEL,
  SHIPMENT_STATUS_LABEL,
} from '@/lib/constants';

function StatusBadgeBase({ status, label, variant = 'secondary' }) {
  return <Badge variant={variant}>{label ?? status ?? '—'}</Badge>;
}

export function OrderStatusBadge({ status }) {
  return (
    <StatusBadgeBase
      status={status}
      label={ORDER_STATUS_LABEL[status] ?? status}
      variant={ORDER_STATUS_VARIANT[status] ?? 'secondary'}
    />
  );
}

export function PaymentStatusBadge({ status }) {
  const variant = status === 'success' ? 'outline' : status === 'failed' ? 'destructive' : 'secondary';
  return <StatusBadgeBase status={status} label={PAYMENT_STATUS_LABEL[status] ?? status} variant={variant} />;
}

export function ShipmentStatusBadge({ status }) {
  const variant = status === 'delivered' ? 'outline' : status === 'failed' || status === 'returned' ? 'destructive' : 'secondary';
  return <StatusBadgeBase status={status} label={SHIPMENT_STATUS_LABEL[status] ?? status} variant={variant} />;
}
