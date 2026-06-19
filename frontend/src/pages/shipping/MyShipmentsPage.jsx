import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Truck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShipmentStatusBadge } from '@/components/common/StatusBadge';
import { PriceTag } from '@/components/common/PriceTag';
import { PageControls } from '@/components/common/PageControls';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { formatDateTime } from '@/lib/formatters';
import { shippingApi } from '@/api';
import { DEFAULT_PAGE_SIZE } from '@/lib/constants';

export default function MyShipmentsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['my-shipments', { page }],
    queryFn: () => shippingApi.myShipments({ page, limit: DEFAULT_PAGE_SIZE }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Theo dõi vận chuyển</h1>
        <p className="text-muted-foreground">Trạng thái giao hàng cho các đơn hàng của bạn</p>
      </div>

      {isLoading && <LoadingState />}
      {isError && <ErrorState error={error} message="Không thể tải danh sách vận đơn" />}
      {!isLoading && !isError && data?.items?.length === 0 && (
        <EmptyState icon={Truck} title="Chưa có vận đơn nào" description="Vận đơn sẽ xuất hiện sau khi đơn hàng được xác nhận." />
      )}

      <div className="space-y-3">
        {data?.items?.map((shipment) => (
          <Card key={shipment.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium">Đơn #{shipment.orderCode}</p>
                <p className="text-sm text-muted-foreground">
                  {shipment.carrier} {shipment.trackingCode ? `· ${shipment.trackingCode}` : ''} · Cập nhật {formatDateTime(shipment.updatedAt)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <PriceTag value={shipment.fee} />
                <ShipmentStatusBadge status={shipment.status} />
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/account/orders`}>Xem đơn hàng</Link>
                </Button>
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
