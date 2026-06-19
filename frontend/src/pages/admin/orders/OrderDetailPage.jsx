import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, MapPin, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { OrderStatusBadge } from '@/components/common/StatusBadge';
import { StatusActionButton } from '@/components/admin/StatusActionButton';
import { PriceTag } from '@/components/common/PriceTag';
import { LoadingState, ErrorState } from '@/components/common/States';
import { formatDateTime } from '@/lib/formatters';
import { ordersApi } from '@/api';
import { ORDER_ALLOWED_TRANSITIONS, ORDER_STATUS_ACTION_LABEL, ORDER_STATUS_LABEL } from '@/lib/constants';

export default function AdminOrderDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const { data: order, isLoading, isError, error } = useQuery({
    queryKey: ['admin-order', id],
    queryFn: () => ordersApi.adminDetail(id),
  });

  const updateStatus = useMutation({
    mutationFn: (status) => ordersApi.adminUpdateStatus(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-order', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success('Đã cập nhật trạng thái đơn hàng');
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Cập nhật trạng thái thất bại'),
  });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState error={error} message="Không thể tải đơn hàng" />;
  if (!order) return null;

  // allowedNext luôn liệt kê bước "tiến tới" trước, bước "ngoại lệ / hủy" sau (nếu có) —
  // thứ tự này phản ánh đúng order.service.js#ALLOWED_TRANSITIONS, FE chỉ render theo đó.
  const [advanceTo, exceptionTo] = ORDER_ALLOWED_TRANSITIONS[order.status] ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/admin/orders"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Đơn hàng #{order.orderCode}</h1>
          <p className="text-sm text-muted-foreground">Khách hàng: User #{order.userId} · Đặt lúc {formatDateTime(order.createdAt)}</p>
        </div>
        <OrderStatusBadge status={order.status} />
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3">
          <p className="font-medium">Cập nhật trạng thái đơn hàng</p>
          <div className="flex flex-1 flex-wrap items-center gap-3 sm:justify-end">
            <span className="text-sm text-muted-foreground">Hiện tại:</span>
            <OrderStatusBadge status={order.status} />
            {!advanceTo ? (
              <p className="text-sm text-muted-foreground">— đây là trạng thái cuối, không thể chuyển tiếp.</p>
            ) : (
              <>
                <StatusActionButton
                  tone="primary"
                  label={ORDER_STATUS_ACTION_LABEL[advanceTo] ?? ORDER_STATUS_LABEL[advanceTo]}
                  dialogTitle={`Chuyển đơn hàng sang "${ORDER_STATUS_LABEL[advanceTo]}"?`}
                  dialogDescription="Hành động này không thể hoàn tác."
                  disabled={updateStatus.isPending}
                  onConfirm={() => updateStatus.mutate(advanceTo)}
                />
                {exceptionTo && (
                  <StatusActionButton
                    tone="caution"
                    label={ORDER_STATUS_ACTION_LABEL[exceptionTo] ?? ORDER_STATUS_LABEL[exceptionTo]}
                    dialogTitle={`${ORDER_STATUS_ACTION_LABEL[exceptionTo] ?? ORDER_STATUS_LABEL[exceptionTo]}?`}
                    dialogDescription="Hành động này không thể hoàn tác."
                    disabled={updateStatus.isPending}
                    onConfirm={() => updateStatus.mutate(exceptionTo)}
                  />
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardContent className="space-y-3">
            <p className="font-semibold">Sản phẩm</p>
            <div className="divide-y">
              {order.items?.map((item) => (
                <div key={item.skuId} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-muted-foreground">{item.skuCode} · <PriceTag value={item.price} /> x {item.quantity}</p>
                  </div>
                  <PriceTag value={item.lineTotal} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-3">
              <p className="flex items-center gap-2 font-semibold"><MapPin className="h-4 w-4" />Thông tin giao hàng</p>
              <div className="text-sm">
                <p className="font-medium">{order.recipient?.name} · {order.recipient?.phone}</p>
                <p className="text-muted-foreground">{order.recipient?.address}</p>
              </div>
              {order.note && (
                <div className="flex items-start gap-2 rounded-md bg-muted p-2 text-sm">
                  <StickyNote className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <p>{order.note}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-2 text-sm">
              <p className="font-semibold">Tổng kết thanh toán</p>
              <div className="flex justify-between"><span className="text-muted-foreground">Tạm tính</span><PriceTag value={order.subtotalAmount} /></div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Khuyến mãi {order.promotionCode ? `(${order.promotionCode})` : ''}</span>
                  <span>−<PriceTag value={order.discountAmount} /></span>
                </div>
              )}
              <div className="flex justify-between"><span className="text-muted-foreground">Phí vận chuyển</span><PriceTag value={order.shippingFee} /></div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Tổng cộng</span>
                <PriceTag value={order.totalAmount} className="text-lg text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
