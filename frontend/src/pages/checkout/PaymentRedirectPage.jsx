import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { AlertCircle, CreditCard, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { paymentsApi } from '@/api';

// Trang trung gian: gọi BE để lấy URL thanh toán VNPay đã được ký số sẵn rồi điều hướng người dùng sang đó.
// FE không tự build URL hay chữ ký — toàn bộ logic VNPay nằm ở Payment Service.
export default function PaymentRedirectPage() {
  const { orderCode } = useParams();
  const [status, setStatus] = useState('idle');

  const createUrl = useMutation({
    mutationFn: () => paymentsApi.createVnpayUrl({ orderCode }),
    onSuccess: (data) => {
      setStatus('redirecting');
      window.location.href = data.paymentUrl;
    },
    onError: () => setStatus('error'),
  });

  useEffect(() => {
    setStatus('creating');
    createUrl.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderCode]);

  return (
    <div className="mx-auto max-w-md py-16">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          {status === 'error' ? (
            <>
              <AlertCircle className="h-10 w-10 text-destructive" />
              <Alert variant="destructive">
                <AlertTitle>Không thể khởi tạo thanh toán</AlertTitle>
                <AlertDescription>{createUrl.error?.response?.data?.message ?? 'Vui lòng thử lại sau.'}</AlertDescription>
              </Alert>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => createUrl.mutate()}>Thử lại</Button>
                <Button asChild variant="ghost">
                  <Link to={`/account/orders`}>Xem đơn hàng của tôi</Link>
                </Button>
              </div>
            </>
          ) : (
            <>
              <CreditCard className="h-10 w-10 text-primary" />
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <div>
                <p className="font-medium">Đang chuyển hướng đến cổng thanh toán VNPay...</p>
                <p className="text-sm text-muted-foreground">Đơn hàng: {orderCode}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
