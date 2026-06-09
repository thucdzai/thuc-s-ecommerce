import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Eye, Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PageControls } from '@/components/common/PageControls';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { formatDate } from '@/lib/formatters';
import { promotionsApi } from '@/api';
import { ADMIN_PAGE_SIZE } from '@/lib/constants';

function isExpired(promotion) {
  return promotion.endsAt && new Date(promotion.endsAt) < new Date();
}

export default function PromotionListPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-promotions', { page }],
    queryFn: () => promotionsApi.adminList({ page, limit: ADMIN_PAGE_SIZE }),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Quản lý khuyến mãi</h1>
          <p className="text-muted-foreground">Tạo và quản lý các mã giảm giá áp dụng cho đơn hàng</p>
        </div>
        <Button asChild>
          <Link to="/admin/promotions/new"><Plus className="mr-2 h-4 w-4" />Thêm mã khuyến mãi</Link>
        </Button>
      </div>

      {isLoading && <LoadingState />}
      {isError && <ErrorState error={error} message="Không thể tải danh sách khuyến mãi" />}
      {!isLoading && !isError && data?.items?.length === 0 && <EmptyState title="Chưa có mã khuyến mãi nào" />}

      {data?.items?.length > 0 && (
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã</TableHead>
                <TableHead>Mô tả</TableHead>
                <TableHead>Giá trị giảm</TableHead>
                <TableHead>Hiệu lực</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((promotion) => (
                <TableRow key={promotion.id}>
                  <TableCell className="font-medium">{promotion.code}</TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">{promotion.description ?? '—'}</TableCell>
                  <TableCell>
                    {promotion.discountType === 'percentage' ? `${promotion.discountValue}%` : <>−{promotion.discountValue?.toLocaleString('vi-VN')} đ</>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatDate(promotion.startsAt)} → {formatDate(promotion.endsAt)}
                  </TableCell>
                  <TableCell>
                    {isExpired(promotion) ? (
                      <Badge variant="destructive">Hết hạn</Badge>
                    ) : promotion.status === 'active' ? (
                      <Badge variant="outline">Đang hoạt động</Badge>
                    ) : (
                      <Badge variant="secondary">Tạm tắt</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" asChild>
                      <Link to={`/admin/promotions/${promotion.id}`}><Eye className="h-4 w-4" /></Link>
                    </Button>
                    <Button variant="ghost" size="icon" asChild>
                      <Link to={`/admin/promotions/${promotion.id}/edit`}><Pencil className="h-4 w-4" /></Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex justify-center">
        <PageControls page={data?.pagination?.page ?? page} totalPages={data?.pagination?.totalPages ?? 1} onPageChange={setPage} />
      </div>
    </div>
  );
}
