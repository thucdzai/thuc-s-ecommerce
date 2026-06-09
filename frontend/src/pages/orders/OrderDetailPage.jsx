import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, MapPin, Receipt, StickyNote, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { OrderStatusBadge, ShipmentStatusBadge } from '@/components/common/StatusBadge';
import { PriceTag } from '@/components/common/PriceTag';
import { LoadingState, ErrorState } from '@/components/common/States';
import { formatDateTime } from '@/lib/formatters';
import { ordersApi, shippingApi } from '@/api';

export default function OrderDetailPage() {
  const { id } = useParams();
  const { data: order, isLoading, isError, error } = useQuery({
    queryKey: ['my-order', id],
    queryFn: () => ordersApi.myOrderDetail(id),
  });

  const { data: shipment } = useQuery({
    queryKey: ['my-shipment', order?.orderCode],
    queryFn: () => shippingApi.myShipmentDetail(order.orderCode),
    enabled: !!order?.orderCode,
    retry: 0,
  });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState error={error} message="Không thể tải đơn hàng" />;
  if (!order) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/account/orders"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Đơn hàng #{order.orderCode}</h1>
          <p className="text-sm text-muted-foreground">Đặt lúc {formatDateTime(order.createdAt)}</p>
        </div>
        <OrderStatusBadge status={order.status} />
        <div className="ml-auto flex gap-2">
          {order.status === 'pending_payment' && (
            <Button asChild>
              <Link to={`/checkout/pay/${order.orderCode}`}><Receipt className="mr-2 h-4 w-4" />Thanh toán ngay</Link>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link to={`/account/payments?orderCode=${order.orderCode}`}>Xem giao dịch thanh toán</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
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

          {shipment && (
            <Card>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-2 font-semibold"><Truck className="h-4 w-4" />Vận chuyển</p>
                  <ShipmentStatusBadge status={shipment.status} />
                </div>
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <p><span className="text-muted-foreground">Đơn vị vận chuyển: </span>{shipment.carrier}</p>
                  <p><span className="text-muted-foreground">Mã vận đơn: </span>{shipment.trackingCode ?? '—'}</p>
                  <p><span className="text-muted-foreground">Phí vận chuyển: </span><PriceTag value={shipment.fee} /></p>
                  <p><span className="text-muted-foreground">Giao dự kiến: </span>{formatDateTime(shipment.deliveredAt ?? shipment.shippedAt)}</p>
                </div>
                {shipment.history?.length > 0 && (
                  <div className="space-y-2 border-t pt-3">
                    <p className="text-sm font-medium">Lịch sử vận chuyển</p>
                    <ol className="space-y-2 border-l pl-4 text-sm">
                      {shipment.history.map((entry, idx) => (
                        <li key={idx} className="relative">
                          <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-primary" />
                          <p className="font-medium">{entry.note}</p>
                          <p className="text-xs text-muted-foreground">{formatDateTime(entry.occurredAt)}</p>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

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
