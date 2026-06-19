import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Package, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OrderStatusBadge } from '@/components/common/StatusBadge';
import { PriceTag } from '@/components/common/PriceTag';
import { PageControls } from '@/components/common/PageControls';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { formatDateTime } from '@/lib/formatters';
import { ordersApi } from '@/api';
import { ORDER_STATUS_LABEL, DEFAULT_PAGE_SIZE } from '@/lib/constants';

const STATUS_FILTERS = [{ value: 'all', label: 'Tất cả trạng thái' }, ...Object.entries(ORDER_STATUS_LABEL).map(([value, label]) => ({ value, label }))];

export default function MyOrdersPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');

  const params = { page, limit: DEFAULT_PAGE_SIZE, status: status === 'all' ? undefined : status };
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['my-orders', params],
    queryFn: () => ordersApi.myOrders(params),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Đơn hàng của tôi</h1>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <LoadingState />}
      {isError && <ErrorState error={error} message="Không thể tải đơn hàng" />}
      {!isLoading && !isError && data?.items?.length === 0 && (
        <EmptyState
          icon={Package}
          title="Bạn chưa có đơn hàng nào"
          description="Các đơn hàng đã đặt sẽ xuất hiện ở đây."
          action={<Button asChild><Link to="/products">Mua sắm ngay</Link></Button>}
        />
      )}

      <div className="space-y-3">
        {data?.items?.map((order) => (
          <Card key={order.id}>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold">Đơn #{order.orderCode}</p>
                  <p className="text-sm text-muted-foreground">{formatDateTime(order.createdAt)}</p>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>
              <div className="space-y-1">
                {order.items?.slice(0, 2).map((item) => (
                  <p key={item.skuId} className="text-sm text-muted-foreground">
                    {item.productName} <span className="text-foreground">x{item.quantity}</span>
                  </p>
                ))}
                {order.items?.length > 2 && <p className="text-sm text-muted-foreground">và {order.items.length - 2} sản phẩm khác...</p>}
              </div>
              <div className="flex items-center justify-between border-t pt-3">
                <div className="text-sm">
                  <span className="text-muted-foreground">Tổng tiền: </span>
                  <PriceTag value={order.totalAmount} className="text-base text-primary" />
                </div>
                <div className="flex gap-2">
                  {order.status === 'pending_payment' && (
                    <Button size="sm" asChild>
                      <Link to={`/checkout/pay/${order.orderCode}`}><Receipt className="mr-2 h-4 w-4" />Thanh toán</Link>
                    </Button>
                  )}
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/account/orders/${order.id}`}>Xem chi tiết</Link>
                  </Button>
                </div>
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
