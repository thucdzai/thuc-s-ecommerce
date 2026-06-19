import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock, Link as LinkIcon, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PaymentStatusBadge } from '@/components/common/StatusBadge';
import { LoadingState } from '@/components/common/States';
import { PriceTag } from '@/components/common/PriceTag';
import { formatDateTime } from '@/lib/formatters';
import { paymentsApi } from '@/api';

// VNPay redirect người dùng về thẳng trang này kèm các tham số vnp_*. Tham số này chỉ phục vụ
// hiển thị tạm thời — trạng thái CHÍNH XÁC luôn lấy từ Payment Service (đã được cập nhật qua
// webhook IPN phía server-to-server, không thể bị giả mạo từ query string).
export default function PaymentResultPage() {
  const [searchParams] = useSearchParams();
  const orderCode = searchParams.get('orderCode') ?? searchParams.get('vnp_TxnRef') ?? null;
  const responseCode = searchParams.get('vnp_ResponseCode');

  const { data: payment, isLoading } = useQuery({
    queryKey: ['payment', orderCode],
    queryFn: () => paymentsApi.myPaymentDetail(orderCode),
    enabled: !!orderCode,
    retry: 1,
  });

  const status = payment?.status ?? (responseCode === '00' ? 'pending' : responseCode ? 'failed' : 'pending');

  const presentation = {
    success: { icon: CheckCircle2, color: 'text-emerald-600', title: 'Thanh toán thành công', desc: 'Đơn hàng của bạn đã được thanh toán và đang được xử lý.' },
    pending: { icon: Clock, color: 'text-amber-600', title: 'Đang xử lý thanh toán', desc: 'Hệ thống đang xác nhận giao dịch của bạn, vui lòng kiểm tra lại sau ít phút.' },
    failed: { icon: XCircle, color: 'text-destructive', title: 'Thanh toán thất bại', desc: 'Giao dịch không thành công. Bạn có thể thử thanh toán lại từ trang đơn hàng.' },
    cancelled: { icon: XCircle, color: 'text-destructive', title: 'Giao dịch đã bị hủy', desc: 'Bạn đã hủy giao dịch thanh toán.' },
  }[status] ?? { icon: Clock, color: 'text-muted-foreground', title: 'Kết quả thanh toán', desc: '' };

  const Icon = presentation.icon;

  return (
    <div className="mx-auto max-w-lg py-10">
      <Card>
        <CardContent className="space-y-6 py-8 text-center">
          {isLoading ? (
            <LoadingState label="Đang xác nhận kết quả thanh toán..." />
          ) : (
            <>
              <Icon className={`mx-auto h-14 w-14 ${presentation.color}`} />
              <div>
                <h1 className="text-xl font-semibold">{presentation.title}</h1>
                <p className="mt-1 text-sm text-muted-foreground">{presentation.desc}</p>
              </div>

              {payment && (
                <div className="space-y-2 rounded-lg border p-4 text-left text-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-muted-foreground"><LinkIcon className="h-4 w-4" />Mã đơn hàng</span>
                    <span className="font-medium">{payment.orderCode}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Số tiền</span>
                    <PriceTag value={payment.amount} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Trạng thái</span>
                    <PaymentStatusBadge status={payment.status} />
                  </div>
                  {payment.paidAt && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Thời gian</span>
                      <span>{formatDateTime(payment.paidAt)}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-center gap-2">
                <Button asChild>
                  <Link to="/account/orders">Xem đơn hàng của tôi</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/products">Tiếp tục mua sắm</Link>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
