import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ShipmentStatusBadge } from '@/components/common/StatusBadge';
import { StatusActionButton } from '@/components/admin/StatusActionButton';
import { PriceTag } from '@/components/common/PriceTag';
import { LoadingState, ErrorState } from '@/components/common/States';
import { formatDateTime } from '@/lib/formatters';
import { shippingApi } from '@/api';
import {
  SHIPMENT_ALLOWED_TRANSITIONS,
  SHIPMENT_STATUS_ACTION_LABEL,
  SHIPMENT_STATUS_LABEL,
} from '@/lib/constants';

export default function AdminShipmentDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const { data: shipment, isLoading, isError, error } = useQuery({
    queryKey: ['admin-shipment', id],
    queryFn: () => shippingApi.adminDetail(id),
  });

  const updateStatus = useMutation({
    mutationFn: (status) => shippingApi.adminUpdateStatus(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-shipment', id] });
      queryClient.invalidateQueries({ queryKey: ['admin-shipments'] });
      toast.success('Đã cập nhật trạng thái vận đơn');
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Cập nhật trạng thái thất bại'),
  });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState error={error} message="Không thể tải vận đơn" />;
  if (!shipment) return null;

  // allowedNext liệt kê bước "tiến tới" trước, bước "ngoại lệ" sau (nếu có) — đúng thứ tự
  // trong shipment.service.js#ALLOWED_TRANSITIONS, FE chỉ render lại theo dữ liệu đó.
  const [advanceTo, exceptionTo] = SHIPMENT_ALLOWED_TRANSITIONS[shipment.status] ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/admin/shipments"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold">Vận đơn — Đơn #{shipment.orderCode}</h1>
          <p className="text-sm text-muted-foreground">
            {shipment.carrier} {shipment.trackingCode ? `· Mã vận đơn: ${shipment.trackingCode}` : ''} · Cập nhật {formatDateTime(shipment.updatedAt)}
          </p>
        </div>
        <ShipmentStatusBadge status={shipment.status} />
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3">
          <p className="font-medium">Cập nhật trạng thái vận đơn</p>
          <div className="flex flex-1 flex-wrap items-center gap-3 sm:justify-end">
            <span className="text-sm text-muted-foreground">Hiện tại:</span>
            <ShipmentStatusBadge status={shipment.status} />
            {!advanceTo ? (
              <p className="text-sm text-muted-foreground">— đây là trạng thái cuối, không thể chuyển tiếp.</p>
            ) : (
              <>
                <StatusActionButton
                  tone="primary"
                  label={SHIPMENT_STATUS_ACTION_LABEL[advanceTo] ?? SHIPMENT_STATUS_LABEL[advanceTo]}
                  dialogTitle={`Chuyển vận đơn sang "${SHIPMENT_STATUS_LABEL[advanceTo]}"?`}
                  dialogDescription="Hành động này không thể hoàn tác."
                  disabled={updateStatus.isPending}
                  onConfirm={() => updateStatus.mutate(advanceTo)}
                />
                {exceptionTo && (
                  <StatusActionButton
                    tone="caution"
                    label={SHIPMENT_STATUS_ACTION_LABEL[exceptionTo] ?? SHIPMENT_STATUS_LABEL[exceptionTo]}
                    dialogTitle={`${SHIPMENT_STATUS_ACTION_LABEL[exceptionTo] ?? SHIPMENT_STATUS_LABEL[exceptionTo]}?`}
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-3">
            <p className="flex items-center gap-2 font-semibold"><MapPin className="h-4 w-4" />Thông tin giao hàng</p>
            <div className="text-sm">
              <p className="font-medium">{shipment.recipientName} · {shipment.recipientPhone}</p>
              <p className="text-muted-foreground">{shipment.recipientAddress}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2 text-sm">
            <p className="font-semibold">Thông tin vận chuyển</p>
            <Separator />
            <div className="flex justify-between"><span className="text-muted-foreground">Đơn vị vận chuyển</span><span>{shipment.carrier}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Mã vận đơn</span><span>{shipment.trackingCode ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Phí vận chuyển</span><PriceTag value={shipment.fee} /></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Dự kiến giao</span><span>{formatDateTime(shipment.estimatedDeliveryAt)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tạo lúc</span><span>{formatDateTime(shipment.createdAt)}</span></div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
