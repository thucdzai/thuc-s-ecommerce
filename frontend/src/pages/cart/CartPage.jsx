import { Link, useNavigate } from 'react-router-dom';
import { ImageOff, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
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
import { LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { useCart, useClearCart, useRemoveCartItem, useUpdateCartItem } from '@/hooks/useCart';

function CartItemRow({ item }) {
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();

  return (
    <div className="flex gap-4 py-4">
      <Link to={`/products/${item.productId}`} className="h-20 w-20 shrink-0 overflow-hidden rounded-md border bg-muted">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.productName} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground"><ImageOff className="h-6 w-6" /></div>
        )}
      </Link>

      <div className="flex flex-1 flex-col justify-between">
        <div className="flex items-start justify-between gap-2">
          <div>
            <Link to={`/products/${item.productId}`} className="line-clamp-2 text-sm font-medium hover:underline">
              {item.productName}
            </Link>
            {item.skuCode && <p className="text-xs text-muted-foreground">Phân loại: {item.skuCode}</p>}
            {item.available === false && <Badge variant="destructive" className="mt-1">{item.unavailableReason ?? 'Sản phẩm không khả dụng'}</Badge>}
          </div>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => removeItem.mutate(item.skuId)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center rounded-md border">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={item.quantity <= 1 || updateItem.isPending}
              onClick={() => updateItem.mutate({ skuId: item.skuId, quantity: item.quantity - 1 })}
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
            <span className="w-8 text-center text-sm">{item.quantity}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={updateItem.isPending}
              onClick={() => updateItem.mutate({ skuId: item.skuId, quantity: item.quantity + 1 })}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          <PriceTag value={item.lineTotal} />
        </div>
      </div>
    </div>
  );
}

export default function CartPage() {
  const navigate = useNavigate();
  const { data: cart, isLoading, isError, error } = useCart();
  const clearCart = useClearCart();

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState error={error} message="Không thể tải giỏ hàng" />;

  if (!cart || cart.items?.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="Giỏ hàng của bạn đang trống"
        description="Hãy khám phá thêm sản phẩm và thêm vào giỏ hàng nhé."
        action={
          <Button asChild>
            <Link to="/products">Tiếp tục mua sắm</Link>
          </Button>
        }
      />
    );
  }

  const hasUnavailable = cart.items.some((item) => item.available === false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Giỏ hàng ({cart.itemCount})</h1>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" className="text-muted-foreground">
              <Trash2 className="mr-2 h-4 w-4" /> Xóa tất cả
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xóa toàn bộ giỏ hàng?</AlertDialogTitle>
              <AlertDialogDescription>Tất cả sản phẩm trong giỏ hàng sẽ bị xóa.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Hủy</AlertDialogCancel>
              <AlertDialogAction onClick={() => clearCart.mutate()}>Xóa tất cả</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardContent className="divide-y">
            {cart.items.map((item) => (
              <CartItemRow key={item.skuId} item={item} />
            ))}
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardContent className="space-y-4">
            <h2 className="font-semibold">Tóm tắt đơn hàng</h2>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tạm tính</span>
              <PriceTag value={cart.subtotal} />
            </div>
            <p className="text-xs text-muted-foreground">Phí vận chuyển và khuyến mãi sẽ được tính ở bước thanh toán.</p>
            <Separator />
            <div className="flex justify-between font-semibold">
              <span>Tổng cộng</span>
              <PriceTag value={cart.subtotal} className="text-lg text-primary" />
            </div>
            {hasUnavailable && (
              <p className="text-sm text-destructive">Một số sản phẩm trong giỏ hàng hiện không khả dụng. Vui lòng kiểm tra lại trước khi thanh toán.</p>
            )}
            <Button className="w-full" size="lg" disabled={hasUnavailable} onClick={() => navigate('/checkout')}>
              Tiến hành thanh toán
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
