import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LoadingState, ErrorState } from '@/components/common/States';
import { formatDateTime, formatDate } from '@/lib/formatters';
import { promotionsApi } from '@/api';

function Field({ label, value }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

export default function PromotionDetailPage() {
  const { id } = useParams();

  const { data: promotion, isLoading, isError, error } = useQuery({
    queryKey: ['admin-promotion', id],
    queryFn: () => promotionsApi.adminDetail(id),
  });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState error={error} message="Không thể tải mã khuyến mãi" />;
  if (!promotion) return null;

  const isExpired = promotion.endsAt && new Date(promotion.endsAt) < new Date();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin/promotions"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold">
              {promotion.code}
              {isExpired ? (
                <Badge variant="destructive">Hết hạn</Badge>
              ) : promotion.status === 'active' ? (
                <Badge variant="outline">Đang hoạt động</Badge>
              ) : (
                <Badge variant="secondary">Tạm tắt</Badge>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">{promotion.description ?? 'Không có mô tả'}</p>
          </div>
        </div>
        <Button asChild>
          <Link to={`/admin/promotions/${promotion.id}/edit`}><Pencil className="mr-2 h-4 w-4" />Chỉnh sửa</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="grid gap-6 sm:grid-cols-3">
          <Field
            label="Loại giảm giá"
            value={promotion.discountType === 'percentage' ? 'Theo phần trăm' : 'Số tiền cố định'}
          />
          <Field
            label="Giá trị giảm"
            value={
              promotion.discountType === 'percentage'
                ? `${promotion.discountValue}%`
                : `${promotion.discountValue?.toLocaleString('vi-VN')} đ`
            }
          />
          <Field
            label="Giảm tối đa"
            value={promotion.maxDiscountAmount ? `${promotion.maxDiscountAmount.toLocaleString('vi-VN')} đ` : 'Không giới hạn'}
          />
          <Field label="Đơn hàng tối thiểu" value={`${(promotion.minOrderAmount ?? 0).toLocaleString('vi-VN')} đ`} />
          <Field label="Giới hạn lượt dùng" value={promotion.usageLimit ?? 'Không giới hạn'} />
          <Field label="Đã sử dụng" value={promotion.usedCount ?? 0} />
          <Field label="Ngày bắt đầu" value={formatDate(promotion.startsAt)} />
          <Field label="Ngày kết thúc" value={formatDate(promotion.endsAt)} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <Separator />
          <p>Tạo lúc: {formatDateTime(promotion.createdAt)}</p>
          <p>Cập nhật lần cuối: {formatDateTime(promotion.updatedAt)}</p>
        </CardContent>
      </Card>
    </div>
  );
}
