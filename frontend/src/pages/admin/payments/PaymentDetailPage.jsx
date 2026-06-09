import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { PaymentStatusBadge } from '@/components/common/StatusBadge';
import { PriceTag } from '@/components/common/PriceTag';
import { LoadingState, ErrorState } from '@/components/common/States';
import { formatDateTime } from '@/lib/formatters';
import { paymentsApi } from '@/api';

function Field({ label, value }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium">{value ?? '—'}</p>
    </div>
  );
}

export default function AdminPaymentDetailPage() {
  const { id } = useParams();

  const { data: payment, isLoading, isError, error } = useQuery({
    queryKey: ['admin-payment', id],
    queryFn: () => paymentsApi.adminDetail(id),
  });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState error={error} message="Không thể tải giao dịch thanh toán" />;
  if (!payment) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/admin/payments"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Giao dịch — Đơn #{payment.orderCode}</h1>
          <p className="text-sm text-muted-foreground">Mã giao dịch: {payment.transactionCode ?? payment.id}</p>
        </div>
        <PaymentStatusBadge status={payment.status} />
      </div>

      <Card>
        <CardContent className="grid gap-6 sm:grid-cols-3">
          <Field label="Cổng thanh toán" value={payment.provider?.toUpperCase()} />
          <Field label="Ngân hàng" value={payment.bankCode} />
          <Field label="Loại thẻ/TK" value={payment.cardType} />
          <Field label="Số tiền" value={<PriceTag value={payment.amount} />} />
          <Field label="Mã giao dịch VNPay" value={payment.vnpTransactionNo} />
          <Field label="Mã tham chiếu ngân hàng" value={payment.bankTransactionNo} />
          <Field label="Thời gian thanh toán" value={formatDateTime(payment.paidAt)} />
          <Field label="Tạo lúc" value={formatDateTime(payment.createdAt)} />
          <Field label="Cập nhật lần cuối" value={formatDateTime(payment.updatedAt)} />
        </CardContent>
      </Card>

      {payment.message && (
        <Card>
          <CardContent className="space-y-2 text-sm">
            <p className="font-semibold">Phản hồi từ cổng thanh toán</p>
            <Separator />
            <p className="text-muted-foreground">{payment.message}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
