import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ShipmentStatusBadge } from '@/components/common/StatusBadge';
import { PriceTag } from '@/components/common/PriceTag';
import { PageControls } from '@/components/common/PageControls';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { formatDateTime } from '@/lib/formatters';
import { shippingApi } from '@/api';
import { SHIPMENT_STATUS_LABEL, ADMIN_PAGE_SIZE } from '@/lib/constants';

const STATUS_FILTERS = [{ value: 'all', label: 'Tất cả trạng thái' }, ...Object.entries(SHIPMENT_STATUS_LABEL).map(([value, label]) => ({ value, label }))];

export default function AdminShipmentListPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  const params = { page, limit: ADMIN_PAGE_SIZE, status: status === 'all' ? undefined : status, q: query || undefined };
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-shipments', params],
    queryFn: () => shippingApi.adminList(params),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Quản lý vận chuyển</h1>
        <p className="text-muted-foreground">Theo dõi và cập nhật trạng thái vận đơn</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setPage(1); setQuery(search.trim()); }}>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo mã đơn hàng..." className="w-60" />
          <Button type="submit" variant="secondary">Tìm</Button>
        </form>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <LoadingState />}
      {isError && <ErrorState error={error} message="Không thể tải danh sách vận đơn" />}
      {!isLoading && !isError && data?.items?.length === 0 && <EmptyState title="Không có vận đơn nào" />}

      {data?.items?.length > 0 && (
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã đơn hàng</TableHead>
                <TableHead>Đơn vị vận chuyển</TableHead>
                <TableHead>Mã vận đơn</TableHead>
                <TableHead>Phí ship</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Cập nhật</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((shipment) => (
                <TableRow key={shipment.id}>
                  <TableCell className="font-medium">{shipment.orderCode}</TableCell>
                  <TableCell>{shipment.carrier}</TableCell>
                  <TableCell className="text-muted-foreground">{shipment.trackingCode ?? '—'}</TableCell>
                  <TableCell><PriceTag value={shipment.fee} /></TableCell>
                  <TableCell><ShipmentStatusBadge status={shipment.status} /></TableCell>
                  <TableCell className="whitespace-nowrap">{formatDateTime(shipment.updatedAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" asChild>
                      <Link to={`/admin/shipments/${shipment.id}`}><Eye className="h-4 w-4" /></Link>
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
