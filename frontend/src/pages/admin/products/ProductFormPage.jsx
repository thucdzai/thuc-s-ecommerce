import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingState, ErrorState } from '@/components/common/States';
import { VariantStockCard } from '@/components/admin/VariantStockCard';
import { ImageUploadField } from '@/components/admin/ImageUploadField';
import { MultiImageUploadField } from '@/components/admin/MultiImageUploadField';
import { categoriesApi, productsApi } from '@/api';

const emptyVariant = { skuCode: '', name: '', price: '', compareAtPrice: '', imageUrl: '' };
const emptyForm = { name: '', categoryId: '', description: '', thumbnailUrl: '', images: [], status: 'active', variants: [emptyVariant] };

function flattenCategories(categories, depth = 0) {
  return categories.flatMap((category) => [
    { ...category, depth },
    ...flattenCategories(category.children ?? [], depth + 1),
  ]);
}

function toFormState(product) {
  if (!product) return emptyForm;
  return {
    name: product.name ?? '',
    categoryId: product.categoryId ? String(product.categoryId) : '',
    description: product.description ?? '',
    thumbnailUrl: product.thumbnailUrl ?? '',
    images: product.images ?? [],
    status: product.status ?? 'active',
    variants: product.variants?.length
      ? product.variants.map((v) => ({
          id: v.id,
          skuCode: v.skuCode ?? '',
          name: v.name ?? '',
          price: v.price ?? '',
          compareAtPrice: v.compareAtPrice ?? '',
          imageUrl: v.imageUrl ?? '',
        }))
      : [emptyVariant],
  };
}

function toPayload(form) {
  return {
    name: form.name.trim(),
    categoryId: form.categoryId ? Number(form.categoryId) : null,
    description: form.description.trim() || undefined,
    thumbnailUrl: form.thumbnailUrl.trim() || undefined,
    images: form.images.map((s) => s.trim()).filter(Boolean),
    status: form.status,
    variants: form.variants
      .filter((v) => v.skuCode.trim())
      .map((v) => ({
        // id: gửi kèm khi sửa biến thể đã có sẵn để BE cập nhật đúng hàng (giữ nguyên sku_id
        // dù đổi mã SKU) — biến thể mới thêm trên form không có id, BE sẽ tự tạo mới.
        id: v.id || undefined,
        skuCode: v.skuCode.trim(),
        name: v.name.trim() || undefined,
        price: Number(v.price) || 0,
        compareAtPrice: v.compareAtPrice ? Number(v.compareAtPrice) : undefined,
        imageUrl: v.imageUrl.trim() || undefined,
      })),
  };
}

export default function AdminProductFormPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState(emptyForm);

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.tree });
  const { data: product, isLoading, isError, error } = useQuery({
    queryKey: ['admin-product', id],
    queryFn: () => productsApi.getById(id),
    enabled: isEdit,
  });

  useEffect(() => {
    if (product) setForm(toFormState(product));
  }, [product]);

  const mutation = useMutation({
    mutationFn: (payload) => (isEdit ? productsApi.update(id, payload) : productsApi.create(payload)),
    onSuccess: (savedProduct) => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      if (isEdit) {
        queryClient.invalidateQueries({ queryKey: ['admin-product', id] });
        toast.success('Đã cập nhật sản phẩm');
      } else {
        // Sau khi tạo mới, ở lại màn hình sửa của chính sản phẩm vừa tạo để admin nhập
        // số lượng tồn kho ban đầu cho từng biến thể — tránh phải tự đi tìm lại sản phẩm.
        toast.success('Đã tạo sản phẩm mới — nhập số lượng tồn kho ban đầu cho từng biến thể bên dưới');
        navigate(`/admin/products/${savedProduct.id}/edit`, { replace: true });
        return;
      }
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Lưu sản phẩm thất bại'),
  });

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function updateVariant(index, key, value) {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.map((v, i) => (i === index ? { ...v, [key]: value } : v)),
    }));
  }

  function addVariant() {
    setForm((prev) => ({ ...prev, variants: [...prev.variants, emptyVariant] }));
  }

  function removeVariant(index) {
    setForm((prev) => {
      const removed = prev.variants[index];
      if (removed?.id) {
        toast.warning('Lưu ý: dữ liệu tồn kho của biến thể đã xóa vẫn còn trong hệ thống kho — cần xử lý riêng nếu muốn ngừng theo dõi hẳn.');
      }
      return { ...prev, variants: prev.variants.filter((_, i) => i !== index) };
    });
  }

  if (isEdit && isLoading) return <LoadingState />;
  if (isEdit && isError) return <ErrorState error={error} message="Không thể tải sản phẩm" />;

  const flatCategories = flattenCategories(categories ?? []);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/admin/products"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-semibold">{isEdit ? 'Chỉnh sửa sản phẩm' : 'Thêm sản phẩm mới'}</h1>
      </div>

      <form
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate(toPayload(form));
        }}
      >
        <Card>
          <CardContent className="space-y-4">
            <p className="font-semibold">Thông tin chung</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Tên sản phẩm</Label>
                <Input id="name" name="name" required value={form.name} onChange={handleChange} />
              </div>
              <div className="space-y-1.5">
                <Label>Danh mục</Label>
                <Select value={form.categoryId} onValueChange={(value) => setForm((prev) => ({ ...prev, categoryId: value }))}>
                  <SelectTrigger><SelectValue placeholder="Chọn danh mục" /></SelectTrigger>
                  <SelectContent>
                    {flatCategories.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        {'— '.repeat(category.depth)}{category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Mô tả</Label>
              <Textarea id="description" name="description" rows={4} value={form.description} onChange={handleChange} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <ImageUploadField
                  label="Ảnh đại diện"
                  value={form.thumbnailUrl}
                  onChange={(url) => setForm((prev) => ({ ...prev, thumbnailUrl: url }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Trạng thái</Label>
                <Select value={form.status} onValueChange={(value) => setForm((prev) => ({ ...prev, status: value }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Đang bán</SelectItem>
                    <SelectItem value="discontinued">Ngừng bán</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Ảnh chi tiết</Label>
              <MultiImageUploadField
                urls={form.images}
                onChange={(images) => setForm((prev) => ({ ...prev, images }))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Biến thể (SKU)</p>
              <Button type="button" variant="outline" size="sm" onClick={addVariant}>
                <Plus className="mr-2 h-4 w-4" />Thêm biến thể
              </Button>
            </div>
            <div className="space-y-4">
              {form.variants.map((variant, index) => (
                <div key={index}>
                  {index > 0 && <Separator className="mb-4" />}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Mã SKU (nội bộ, dùng để quản lý kho)</Label>
                      <Input required value={variant.skuCode} onChange={(e) => updateVariant(index, 'skuCode', e.target.value)} placeholder="SKU-001" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Tên hiển thị cho khách (vd "Áo đen size M")</Label>
                      <Input value={variant.name} onChange={(e) => updateVariant(index, 'name', e.target.value)} placeholder="Để trống sẽ hiển thị theo thuộc tính/mã SKU" />
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                    <div className="space-y-1.5">
                      <Label>Giá bán (đ)</Label>
                      <Input required inputMode="numeric" value={variant.price} onChange={(e) => updateVariant(index, 'price', e.target.value)} placeholder="100000" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Giá so sánh (đ)</Label>
                      <Input inputMode="numeric" value={variant.compareAtPrice} onChange={(e) => updateVariant(index, 'compareAtPrice', e.target.value)} placeholder="Tùy chọn" />
                    </div>
                    <div className="flex items-end">
                      {form.variants.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => removeVariant(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <ImageUploadField
                      label="Ảnh biến thể (tùy chọn)"
                      value={variant.imageUrl}
                      onChange={(url) => updateVariant(index, 'imageUrl', url)}
                    />
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <Label>Tồn kho</Label>
                    {variant.id ? (
                      <VariantStockCard skuId={variant.id} skuCode={variant.skuCode} />
                    ) : (
                      <p className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                        Biến thể mới sẽ có tồn kho ban đầu = 0 sau khi lưu — quay lại đây để nhập số lượng nhập kho.
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" asChild>
            <Link to="/admin/products">Hủy</Link>
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo sản phẩm'}
          </Button>
        </div>
      </form>
    </div>
  );
}
