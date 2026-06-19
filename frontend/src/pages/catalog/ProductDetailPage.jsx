import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ImageOff, Minus, Plus, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PriceTag } from '@/components/common/PriceTag';
import { LoadingState, ErrorState } from '@/components/common/States';
import { productsApi, inventoryApi } from '@/api';
import { useAddToCart } from '@/hooks/useCart';
import { useAuthStore } from '@/stores/authStore';

// Khách hàng cần thấy tên dễ hiểu để chọn biến thể — ưu tiên `name` (tên hiển thị admin đặt
// riêng cho khách), rồi tới các thuộc tính (Màu sắc/Kích thước...), cuối cùng mới là mã SKU
// nội bộ (vốn do người bán tự đặt để quản lý kho, không nhằm mục đích hiển thị cho khách).
function variantLabel(variant) {
  if (variant.name) return variant.name;
  const attributeValues = variant.attributes ? Object.values(variant.attributes) : [];
  if (attributeValues.length > 0) return attributeValues.join(' / ');
  return variant.skuCode;
}

function VariantPicker({ variants, selected, onSelect }) {
  if (variants.length <= 1) return null;
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Phân loại</p>
      <div className="flex flex-wrap gap-2">
        {variants.map((variant) => (
          <Button
            key={variant.id}
            type="button"
            variant={selected?.id === variant.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSelect(variant)}
          >
            {variantLabel(variant)}
          </Button>
        ))}
      </div>
    </div>
  );
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const addToCart = useAddToCart();

  const [activeImage, setActiveImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);

  const { data: product, isLoading, isError, error } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.getById(id),
  });

  useEffect(() => {
    if (product?.variants?.length) {
      setSelectedVariant(product.variants[0]);
      setQuantity(1);
      setActiveImage(0);
    }
  }, [product]);

  const { data: stock } = useQuery({
    queryKey: ['inventory', selectedVariant?.id],
    queryFn: () => inventoryApi.getBySku(selectedVariant.id),
    enabled: !!selectedVariant?.id,
  });

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState error={error} message="Không thể tải sản phẩm" />;
  if (!product) return null;

  // Khi biến thể đang chọn có ảnh riêng, đưa ảnh đó lên đầu để hiển thị ngay — vẫn giữ các
  // ảnh chung của sản phẩm phía sau để khách xem thêm góc độ/chi tiết khác.
  const baseImages = product.images?.length ? product.images : product.thumbnailUrl ? [product.thumbnailUrl] : [];
  const images = selectedVariant?.imageUrl
    ? [selectedVariant.imageUrl, ...baseImages.filter((src) => src !== selectedVariant.imageUrl)]
    : baseImages;
  const available = stock?.quantityAvailable ?? null;
  const outOfStock = available != null && available <= 0;

  function handleAddToCart() {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: `/products/${id}` } } });
      return;
    }
    if (!selectedVariant) return;
    addToCart.mutate({ skuId: selectedVariant.id, quantity });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-3">
        <div className="aspect-square overflow-hidden rounded-xl border bg-muted">
          {images[activeImage] ? (
            <img src={images[activeImage]} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ImageOff className="h-10 w-10" />
            </div>
          )}
        </div>
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto">
            {images.map((src, idx) => (
              <button
                key={src + idx}
                type="button"
                onClick={() => setActiveImage(idx)}
                className={`h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 ${idx === activeImage ? 'border-primary' : 'border-transparent'}`}
              >
                <img src={src} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold">{product.name}</h1>
          <Badge variant="outline" className="mt-2">{product.status === 'active' ? 'Còn hàng' : product.status}</Badge>
        </div>

        <PriceTag value={selectedVariant?.price} className="text-3xl text-primary" />
        {selectedVariant?.compareAtPrice > selectedVariant?.price && (
          <span className="ml-2 text-sm text-muted-foreground line-through">
            <PriceTag value={selectedVariant.compareAtPrice} />
          </span>
        )}

        <Separator />

        {product.variants?.length > 0 && (
          <VariantPicker
            variants={product.variants}
            selected={selectedVariant}
            onSelect={(variant) => {
              setSelectedVariant(variant);
              setActiveImage(0);
            }}
          />
        )}

        {selectedVariant && (
          <p className="text-sm text-muted-foreground">
            Tình trạng kho:{' '}
            {available == null ? 'Đang kiểm tra...' : outOfStock ? <span className="font-medium text-destructive">Hết hàng</span> : <span className="font-medium text-foreground">Còn {available} sản phẩm</span>}
          </p>
        )}

        <div className="flex items-center gap-4">
          <div className="flex items-center rounded-md border">
            <Button type="button" variant="ghost" size="icon" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-10 text-center text-sm font-medium">{quantity}</span>
            <Button type="button" variant="ghost" size="icon" onClick={() => setQuantity((q) => q + 1)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <Button size="lg" className="flex-1" disabled={outOfStock || addToCart.isPending} onClick={handleAddToCart}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            {addToCart.isPending ? 'Đang thêm...' : 'Thêm vào giỏ hàng'}
          </Button>
        </div>

        <Separator />

        <div className="space-y-2">
          <h2 className="font-semibold">Mô tả sản phẩm</h2>
          <p className="whitespace-pre-line text-sm text-muted-foreground">{product.description || 'Chưa có mô tả cho sản phẩm này.'}</p>
        </div>
      </div>
    </div>
  );
}
