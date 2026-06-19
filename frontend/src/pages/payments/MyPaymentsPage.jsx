import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Receipt } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { PaymentStatusBadge } from '@/components/common/StatusBadge';
import { PriceTag } from '@/components/common/PriceTag';
import { PageControls } from '@/components/common/PageControls';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { formatDateTime } from '@/lib/formatters';
import { paymentsApi } from '@/api';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';

export default function MyPaymentsPage() {
  const [searchParams] = useSearchParams();
  const highlightOrderCode = searchParams.get('orderCode');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['my-payments', { page }],
    queryFn: () => paymentsApi.myPayments({ page, limit: DEFAULT_PAGE_SIZE }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Lịch sử thanh toán</h1>
        <p className="text-muted-foreground">Các giao dịch thanh toán cho đơn hàng của bạn</p>
      </div>

      {isLoading && <LoadingState />}
      {isError && <ErrorState error={error} message="Không thể tải lịch sử thanh toán" />}
      {!isLoading && !isError && data?.items?.length === 0 && (
        <EmptyState icon={Receipt} title="Chưa có giao dịch nào" description="Lịch sử thanh toán của bạn sẽ hiển thị tại đây." />
      )}

      <div className="space-y-3">
        {data?.items?.map((payment) => (
          <Card key={payment.id} className={payment.orderCode === highlightOrderCode ? 'border-primary' : undefined}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">Đơn #{payment.orderCode}</p>
                <p className="text-sm text-muted-foreground">
                  {payment.provider?.toUpperCase()} {payment.bankCode ? `· ${payment.bankCode}` : ''} · {formatDateTime(payment.paidAt ?? payment.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <PriceTag value={payment.amount} className="text-base" />
                <PaymentStatusBadge status={payment.status} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-center">
        <PageControls page={data?.pagination?.page ?? page} totalPages={data?.pagination?.totalPages ?? 1} onPageChange={setPage} />
      </div>
    </div>
  );
}
