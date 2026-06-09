import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ImageOff, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { PriceTag } from '@/components/common/PriceTag';
import { PageControls } from '@/components/common/PageControls';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { productsApi } from '@/api';
import { ADMIN_PAGE_SIZE } from '@/lib/constants';

const STATUS_LABELS = {
  draft: 'Bản nháp',
  active: 'Đang bán',
  discontinued: 'Ngừng bán',
};

// Tô nền theo trạng thái — admin lướt nhanh là phân biệt được ngay sản phẩm nào đang ngừng
// bán/còn nháp (mà vẫn nằm trong danh sách để mở bán lại) so với sản phẩm đang bán bình thường.
const STATUS_ROW_CLASSES = {
  draft: 'bg-amber-50/60 hover:bg-amber-50 dark:bg-amber-950/10 dark:hover:bg-amber-950/20',
  discontinued: 'bg-muted/50 hover:bg-muted/70 text-muted-foreground',
};

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'active', label: 'Đang bán' },
  { value: 'discontinued', label: 'Ngừng bán' },
  { value: 'draft', label: 'Bản nháp' },
];

function DeleteProductButton({ product }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => productsApi.remove(product.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      toast.success('Đã xóa sản phẩm');
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Xóa sản phẩm thất bại'),
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xóa sản phẩm "{product.name}"?</AlertDialogTitle>
          <AlertDialogDescription>Hành động này không thể hoàn tác.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Hủy</AlertDialogCancel>
          <AlertDialogAction onClick={() => mutation.mutate()}>Xóa</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function AdminProductListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const params = {
    page,
    limit: ADMIN_PAGE_SIZE,
    q: query || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
  };
  // Dùng adminList (GET /admin/products) thay vì list (GET /products dành cho khách): endpoint
  // công khai khoá cứng status='active' nên sản phẩm vừa chuyển "Ngừng bán" sẽ biến mất khỏi
  // chính trang quản lý của admin — admin vẫn cần thấy để còn sửa/mở bán lại.
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-products', params],
    queryFn: () => productsApi.adminList(params),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Quản lý sản phẩm</h1>
          <p className="text-muted-foreground">Thêm mới, chỉnh sửa và quản lý danh mục sản phẩm</p>
        </div>
        <Button asChild>
          <Link to="/admin/products/new"><Plus className="mr-2 h-4 w-4" />Thêm sản phẩm</Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <form
          className="flex max-w-sm gap-2"
          onSubmit={(e) => { e.preventDefault(); setPage(1); setQuery(search.trim()); }}
        >
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tên sản phẩm..." />
          <Button type="submit" variant="secondary">Tìm</Button>
        </form>
        <Select value={statusFilter} onValueChange={(value) => { setPage(1); setStatusFilter(value); }}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {STATUS_FILTER_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <LoadingState />}
      {isError && <ErrorState error={error} message="Không thể tải danh sách sản phẩm" />}
      {!isLoading && !isError && data?.items?.length === 0 && <EmptyState title="Chưa có sản phẩm nào" />}

      {data?.items?.length > 0 && (
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Ảnh</TableHead>
                <TableHead>Tên sản phẩm</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Số biến thể</TableHead>
                <TableHead>Giá thấp nhất</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((product) => (
                <TableRow key={product.id} className={STATUS_ROW_CLASSES[product.status] ?? ''}>
                  <TableCell>
                    <div className="h-10 w-10 overflow-hidden rounded-md border bg-muted">
                      {product.thumbnailUrl ? (
                        <img src={product.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground"><ImageOff className="h-4 w-4" /></div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="truncate font-medium">{product.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{product.slug}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.status === 'active' ? 'outline' : 'secondary'}>{STATUS_LABELS[product.status] ?? product.status}</Badge>
                  </TableCell>
                  <TableCell>{product.variantCount ?? 0}</TableCell>
                  <TableCell>{product.priceFrom != null ? <PriceTag value={product.priceFrom} /> : '—'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" asChild>
                      <Link to={`/admin/products/${product.id}/edit`}><Pencil className="h-4 w-4" /></Link>
                    </Button>
                    <DeleteProductButton product={product} />
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
