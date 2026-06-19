import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingState, ErrorState } from '@/components/common/States';
import { promotionsApi } from '@/api';

const EMPTY_FORM = {
  code: '',
  description: '',
  discountType: 'percentage',
  discountValue: '',
  maxDiscountAmount: '',
  minOrderAmount: '0',
  usageLimit: '',
  startsAt: '',
  endsAt: '',
  status: 'active',
};

function toDateInputValue(isoString) {
  if (!isoString) return '';
  return isoString.slice(0, 10);
}

function toFormState(promotion) {
  if (!promotion) return EMPTY_FORM;
  return {
    code: promotion.code ?? '',
    description: promotion.description ?? '',
    discountType: promotion.discountType ?? 'percentage',
    discountValue: promotion.discountValue != null ? String(promotion.discountValue) : '',
    maxDiscountAmount: promotion.maxDiscountAmount != null ? String(promotion.maxDiscountAmount) : '',
    minOrderAmount: promotion.minOrderAmount != null ? String(promotion.minOrderAmount) : '0',
    usageLimit: promotion.usageLimit != null ? String(promotion.usageLimit) : '',
    startsAt: toDateInputValue(promotion.startsAt),
    endsAt: toDateInputValue(promotion.endsAt),
    status: promotion.status ?? 'active',
  };
}

function toPayload(form, isEdit) {
  const payload = {
    description: form.description.trim() || undefined,
    discountType: form.discountType,
    discountValue: Number(form.discountValue),
    maxDiscountAmount: form.maxDiscountAmount ? Number(form.maxDiscountAmount) : undefined,
    minOrderAmount: form.minOrderAmount ? Number(form.minOrderAmount) : 0,
    usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
    startsAt: new Date(form.startsAt).toISOString(),
    endsAt: new Date(form.endsAt).toISOString(),
    status: form.status,
  };
  if (!isEdit) payload.code = form.code.trim().toUpperCase();
  return payload;
}

export default function PromotionFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: promotion, isLoading, isError, error } = useQuery({
    queryKey: ['admin-promotion', id],
    queryFn: () => promotionsApi.adminDetail(id),
    enabled: isEdit,
  });

  useEffect(() => {
    if (promotion) setForm(toFormState(promotion));
  }, [promotion]);

  const mutation = useMutation({
    mutationFn: () =>
      isEdit ? promotionsApi.adminUpdate(id, toPayload(form, true)) : promotionsApi.adminCreate(toPayload(form, false)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-promotions'] });
      if (isEdit) queryClient.invalidateQueries({ queryKey: ['admin-promotion', id] });
      toast.success(isEdit ? 'Đã cập nhật mã khuyến mãi' : 'Đã tạo mã khuyến mãi');
      navigate('/admin/promotions');
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Lưu mã khuyến mãi thất bại'),
  });

  const update = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  if (isEdit && isLoading) return <LoadingState />;
  if (isEdit && isError) return <ErrorState error={error} message="Không thể tải mã khuyến mãi" />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/admin/promotions"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">{isEdit ? 'Chỉnh sửa mã khuyến mãi' : 'Thêm mã khuyến mãi'}</h1>
          <p className="text-muted-foreground">{isEdit ? `Mã: ${form.code}` : 'Tạo mã giảm giá mới áp dụng cho đơn hàng'}</p>
        </div>
      </div>

      <Card>
        <CardContent>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="code">Mã khuyến mãi</Label>
              <Input id="code" required disabled={isEdit} value={form.code} onChange={update('code')} placeholder="VD: SUMMER2026" />
              {isEdit && <p className="text-xs text-muted-foreground">Không thể thay đổi mã sau khi tạo</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="status">Trạng thái</Label>
              <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Đang hoạt động</SelectItem>
                  <SelectItem value="inactive">Tạm tắt</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="description">Mô tả</Label>
              <Textarea id="description" value={form.description} onChange={update('description')} placeholder="Mô tả ngắn gọn về chương trình khuyến mãi..." />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="discountType">Loại giảm giá</Label>
              <Select value={form.discountType} onValueChange={(v) => setForm((p) => ({ ...p, discountType: v }))}>
                <SelectTrigger id="discountType"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Theo phần trăm (%)</SelectItem>
                  <SelectItem value="fixed">Số tiền cố định (đ)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="discountValue">
                Giá trị giảm {form.discountType === 'percentage' ? '(%, tối đa 100)' : '(đ)'}
              </Label>
              <Input
                id="discountValue"
                type="number"
                min="0"
                max={form.discountType === 'percentage' ? '100' : undefined}
                required
                value={form.discountValue}
                onChange={update('discountValue')}
              />
            </div>

            {form.discountType === 'percentage' && (
              <div className="space-y-1.5">
                <Label htmlFor="maxDiscountAmount">Số tiền giảm tối đa (đ)</Label>
                <Input id="maxDiscountAmount" type="number" min="0" value={form.maxDiscountAmount} onChange={update('maxDiscountAmount')} placeholder="Không giới hạn" />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="minOrderAmount">Giá trị đơn hàng tối thiểu (đ)</Label>
              <Input id="minOrderAmount" type="number" min="0" value={form.minOrderAmount} onChange={update('minOrderAmount')} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="usageLimit">Giới hạn lượt sử dụng</Label>
              <Input id="usageLimit" type="number" min="1" value={form.usageLimit} onChange={update('usageLimit')} placeholder="Không giới hạn" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="startsAt">Ngày bắt đầu</Label>
              <Input id="startsAt" type="date" required value={form.startsAt} onChange={update('startsAt')} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="endsAt">Ngày kết thúc</Label>
              <Input id="endsAt" type="date" required value={form.endsAt} onChange={update('endsAt')} />
            </div>

            <div className="flex justify-end gap-3 sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => navigate('/admin/promotions')}>Hủy</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo mã khuyến mãi'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
