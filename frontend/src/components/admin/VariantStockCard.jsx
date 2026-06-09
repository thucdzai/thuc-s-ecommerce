import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { History, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatDateTime } from '@/lib/formatters';
import { inventoryApi } from '@/api';

// Khớp với enum change_type thực tế trong bảng stock_logs (warehouse-service):
// 'lock' | 'release' | 'deduct' | 'import' | 'adjustment'
const CHANGE_TYPE_LABEL = {
  lock: 'Giữ chỗ',
  release: 'Nhả giữ chỗ',
  deduct: 'Trừ kho (đã thanh toán)',
  import: 'Nhập kho',
  adjustment: 'Điều chỉnh thủ công',
};

const LOW_STOCK_THRESHOLD = 5;

function AdjustStockDialog({ skuId, skuCode, onAdjusted }) {
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState('increase');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      inventoryApi.adjust(skuId, {
        quantityChange: direction === 'increase' ? Number(quantity) : -Number(quantity),
        note: note.trim() || undefined,
      }),
    onSuccess: () => {
      toast.success('Đã điều chỉnh tồn kho');
      setOpen(false);
      setQuantity('');
      setNote('');
      onAdjusted?.();
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Điều chỉnh tồn kho thất bại'),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">Điều chỉnh tồn kho</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Điều chỉnh tồn kho — {skuCode || `SKU #${skuId}`}</DialogTitle>
        </DialogHeader>
        <form
          id={`adjust-form-${skuId}`}
          className="space-y-3 py-2"
          onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
        >
          <div className="space-y-1.5">
            <Label>Loại điều chỉnh</Label>
            <Select value={direction} onValueChange={setDirection}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="increase">Nhập thêm (tăng tồn kho)</SelectItem>
                <SelectItem value="decrease">Hiệu chỉnh giảm (kiểm kê, hư hỏng...)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`quantity-${skuId}`}>Số lượng</Label>
            <Input id={`quantity-${skuId}`} inputMode="numeric" required value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`note-${skuId}`}>Ghi chú</Label>
            <Textarea id={`note-${skuId}`} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Lý do điều chỉnh..." />
          </div>
        </form>
        <DialogFooter>
          <Button type="submit" form={`adjust-form-${skuId}`} disabled={mutation.isPending}>
            {mutation.isPending ? 'Đang lưu...' : 'Xác nhận điều chỉnh'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RecentStockLogs({ skuId }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-inventory-logs', skuId],
    queryFn: () => inventoryApi.logs({ skuId, limit: 5 }),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Đang tải nhật ký...</p>;
  if (isError) return <p className="text-sm text-muted-foreground">Không thể tải nhật ký kho</p>;
  if (!data?.items?.length) return <p className="text-sm text-muted-foreground">Chưa có biến động tồn kho nào</p>;

  return (
    <div className="space-y-1.5">
      {data.items.map((log) => (
        <div key={log.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-1.5 text-sm">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{CHANGE_TYPE_LABEL[log.changeType] ?? log.changeType}</Badge>
            <span className={log.quantityChange < 0 ? 'text-destructive' : 'text-emerald-600'}>
              {log.quantityChange > 0 ? `+${log.quantityChange}` : log.quantityChange}
            </span>
            {log.note && <span className="truncate text-muted-foreground">{log.note}</span>}
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(log.createdAt)}</span>
        </div>
      ))}
    </div>
  );
}

// Hiển thị + điều chỉnh tồn kho ngay trong dòng biến thể — gộp nghiệp vụ "kho hàng" vào
// trang quản lý sản phẩm để admin không phải tự tra cứu skuId ở một trang riêng.
export function VariantStockCard({ skuId, skuCode }) {
  const queryClient = useQueryClient();
  const [showLogs, setShowLogs] = useState(false);

  const { data: stock, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-inventory', skuId],
    queryFn: () => inventoryApi.getBySku(skuId),
    enabled: !!skuId,
    // Ngay sau khi tạo sản phẩm mới, warehouse-service cần một khoảng thời gian ngắn để
    // đồng bộ SKU qua Kafka trước khi dòng tồn kho xuất hiện — thử lại vài lần thay vì báo lỗi ngay.
    retry: (failureCount, err) => err?.response?.status === 404 && failureCount < 5,
    retryDelay: 1500,
  });

  function handleAdjusted() {
    queryClient.invalidateQueries({ queryKey: ['admin-inventory', skuId] });
    queryClient.invalidateQueries({ queryKey: ['admin-inventory-logs', skuId] });
  }

  if (isLoading || (isError && error?.response?.status === 404 && isFetching)) {
    return (
      <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Đang đồng bộ tồn kho cho biến thể vừa tạo, vui lòng đợi trong giây lát...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
        <span>Chưa thể tải thông tin tồn kho cho biến thể này.</span>
        <Button type="button" variant="ghost" size="sm" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />Thử lại
        </Button>
      </div>
    );
  }

  const locked = stock.quantityOnHand - stock.quantityAvailable;
  const isLowStock = stock.quantityAvailable <= LOW_STOCK_THRESHOLD && stock.status === 'active';

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
        <span>Tồn thực tế: <strong>{stock.quantityOnHand}</strong></span>
        <span>Khả dụng: <strong className="text-primary">{stock.quantityAvailable}</strong></span>
        <span className="text-muted-foreground">Đang giữ chỗ: {locked}</span>
        <Badge variant={stock.status === 'active' ? 'outline' : 'secondary'}>
          {stock.status === 'active' ? 'Đang kinh doanh' : 'Ngừng kinh doanh'}
        </Badge>
        {isLowStock && <Badge variant="destructive">Sắp hết hàng</Badge>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <AdjustStockDialog skuId={skuId} skuCode={skuCode} onAdjusted={handleAdjusted} />
        <Button type="button" variant="ghost" size="sm" onClick={() => setShowLogs((v) => !v)}>
          <History className="mr-2 h-4 w-4" />{showLogs ? 'Ẩn nhật ký kho' : 'Xem nhật ký kho'}
        </Button>
      </div>
      {showLogs && <RecentStockLogs skuId={skuId} />}
    </div>
  );
}
