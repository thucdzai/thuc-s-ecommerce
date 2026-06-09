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
import { PaymentStatusBadge } from '@/components/common/StatusBadge';
import { PriceTag } from '@/components/common/PriceTag';
import { PageControls } from '@/components/common/PageControls';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { formatDateTime } from '@/lib/formatters';
import { paymentsApi } from '@/api';
import { PAYMENT_STATUS_LABEL, ADMIN_PAGE_SIZE } from '@/lib/constants';

const STATUS_FILTERS = [{ value: 'all', label: 'Tất cả trạng thái' }, ...Object.entries(PAYMENT_STATUS_LABEL).map(([value, label]) => ({ value, label }))];

export default function AdminPaymentListPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  const params = { page, limit: ADMIN_PAGE_SIZE, status: status === 'all' ? undefined : status, q: query || undefined };
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-payments', params],
    queryFn: () => paymentsApi.adminList(params),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Quản lý thanh toán</h1>
        <p className="text-muted-foreground">Theo dõi giao dịch thanh toán qua VNPay của khách hàng</p>
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
      {isError && <ErrorState error={error} message="Không thể tải danh sách thanh toán" />}
      {!isLoading && !isError && data?.items?.length === 0 && <EmptyState title="Không có giao dịch nào" />}

      {data?.items?.length > 0 && (
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã đơn hàng</TableHead>
                <TableHead>Cổng thanh toán</TableHead>
                <TableHead>Số tiền</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Thời gian</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">{payment.orderCode}</TableCell>
                  <TableCell>{payment.provider?.toUpperCase()} {payment.bankCode ? `· ${payment.bankCode}` : ''}</TableCell>
                  <TableCell><PriceTag value={payment.amount} /></TableCell>
                  <TableCell><PaymentStatusBadge status={payment.status} /></TableCell>
                  <TableCell className="whitespace-nowrap">{formatDateTime(payment.paidAt ?? payment.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" asChild>
                      <Link to={`/admin/payments/${payment.id}`}><Eye className="h-4 w-4" /></Link>
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
