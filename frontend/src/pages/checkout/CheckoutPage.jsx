import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MapPin, Tag, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { PriceTag } from '@/components/common/PriceTag';
import { useCart } from '@/hooks/useCart';
import { useAuthStore } from '@/stores/authStore';
import { cartApi, ordersApi, promotionsApi, shippingApi, usersApi } from '@/api';

function formatAddress(address) {
  return [address.streetDetail, address.ward, address.district, address.province].filter(Boolean).join(', ');
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { data: cart, isLoading: isCartLoading } = useCart();
  const { data: addresses, isLoading: isAddressesLoading } = useQuery({
    queryKey: ['addresses', user?.id],
    queryFn: () => usersApi.getAddresses(user.id),
    enabled: !!user?.id,
  });

  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [note, setNote] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoResult, setPromoResult] = useState(null);
  const [shippingPreview, setShippingPreview] = useState(null);

  const selectedAddress = addresses?.find((a) => String(a.id) === String(selectedAddressId)) ?? addresses?.find((a) => a.isDefault) ?? addresses?.[0];

  const previewPromo = useMutation({
    mutationFn: () => promotionsApi.preview({ code: promoCode.trim(), subtotalAmount: cart?.subtotal }),
    onSuccess: (data) => {
      setPromoResult(data);
      toast.success('Áp dụng mã khuyến mãi thành công');
    },
    onError: (err) => {
      setPromoResult(null);
      toast.error(err?.response?.data?.message ?? 'Mã khuyến mãi không hợp lệ');
    },
  });

  const previewShipping = useMutation({
    mutationFn: () => shippingApi.calculateFee({ address: formatAddress(selectedAddress) }),
    onSuccess: (data) => setShippingPreview(data),
    onError: () => setShippingPreview(null),
  });

  const checkout = useMutation({
    mutationFn: () =>
      ordersApi.checkout({
        items: cart.items.map((item) => ({ skuId: item.skuId, quantity: item.quantity })),
        recipientName: selectedAddress.recipientName,
        recipientPhone: selectedAddress.phone,
        shippingAddress: formatAddress(selectedAddress),
        promoCode: promoResult ? promoCode.trim() : undefined,
        note: note.trim() || undefined,
      }),
    onSuccess: async (order) => {
      // Đơn hàng đã chốt số lượng từ giỏ hàng — dọn giỏ để tránh đặt lại nhầm các sản phẩm vừa mua.
      try {
        await cartApi.clear();
      } finally {
        queryClient.invalidateQueries({ queryKey: ['cart'] });
      }
      toast.success('Đặt hàng thành công, vui lòng thanh toán để hoàn tất');
      navigate(`/checkout/pay/${order.orderCode}`);
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Đặt hàng thất bại, vui lòng thử lại'),
  });

  if (isCartLoading || isAddressesLoading) return <LoadingState />;

  if (!cart?.items?.length) {
    return <EmptyState title="Giỏ hàng trống" description="Vui lòng thêm sản phẩm vào giỏ hàng trước khi thanh toán." />;
  }

  if (!addresses?.length) {
    return (
      <EmptyState
        icon={MapPin}
        title="Bạn chưa có địa chỉ giao hàng"
        description="Vui lòng thêm địa chỉ trong sổ địa chỉ trước khi đặt hàng."
        action={<Button onClick={() => navigate('/account/addresses')}>Thêm địa chỉ</Button>}
      />
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Thanh toán</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 font-semibold">
                <MapPin className="h-4 w-4" /> Địa chỉ giao hàng
              </div>
              <RadioGroup value={String(selectedAddress?.id)} onValueChange={setSelectedAddressId}>
                {addresses.map((address) => (
                  <Label
                    key={address.id}
                    htmlFor={`address-${address.id}`}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-[[data-state=checked]]:border-primary"
                  >
                    <RadioGroupItem value={String(address.id)} id={`address-${address.id}`} className="mt-1" />
                    <div className="text-sm">
                      <p className="font-medium">{address.recipientName} · {address.phone}</p>
                      <p className="text-muted-foreground">{formatAddress(address)}</p>
                    </div>
                  </Label>
                ))}
              </RadioGroup>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!selectedAddress || previewShipping.isPending}
                onClick={() => previewShipping.mutate()}
              >
                <Truck className="mr-2 h-4 w-4" />
                {previewShipping.isPending ? 'Đang tính phí...' : 'Xem trước phí vận chuyển'}
              </Button>
              {shippingPreview && (
                <p className="text-sm text-muted-foreground">
                  Phí vận chuyển dự kiến: <PriceTag value={shippingPreview.fee} />
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 font-semibold">
                <Tag className="h-4 w-4" /> Mã khuyến mãi
              </div>
              <div className="flex gap-2">
                <Input value={promoCode} onChange={(e) => { setPromoCode(e.target.value); setPromoResult(null); }} placeholder="Nhập mã khuyến mãi" />
                <Button type="button" variant="secondary" disabled={!promoCode.trim() || previewPromo.isPending} onClick={() => previewPromo.mutate()}>
                  {previewPromo.isPending ? 'Đang kiểm tra...' : 'Áp dụng'}
                </Button>
              </div>
              {promoResult && (
                <p className="text-sm text-emerald-600">
                  Mã "{promoResult.code}" áp dụng — giảm <PriceTag value={promoResult.discountAmount} />
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3">
              <p className="font-semibold">Sản phẩm ({cart.itemCount})</p>
              <div className="divide-y">
                {cart.items.map((item) => (
                  <div key={item.skuId} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-muted-foreground">{item.skuCode} · x{item.quantity}</p>
                    </div>
                    <PriceTag value={item.lineTotal} />
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="note">Ghi chú đơn hàng (tùy chọn)</Label>
                <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ví dụ: giao giờ hành chính..." />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardContent className="space-y-3">
            <h2 className="font-semibold">Tóm tắt đơn hàng</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tạm tính</span>
                <PriceTag value={cart.subtotal} />
              </div>
              {promoResult && (
                <div className="flex justify-between text-emerald-600">
                  <span>Giảm giá</span>
                  <span>−<PriceTag value={promoResult.discountAmount} /></span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phí vận chuyển</span>
                <span>{shippingPreview ? <PriceTag value={shippingPreview.fee} /> : 'Tính khi đặt hàng'}</span>
              </div>
            </div>
            <Separator />
            <p className="text-xs text-muted-foreground">
              Tổng tiền cuối cùng (đã gồm khuyến mãi và phí vận chuyển) sẽ được hệ thống tính chính xác khi bạn đặt hàng.
            </p>
            <Button className="w-full" size="lg" disabled={checkout.isPending} onClick={() => checkout.mutate()}>
              {checkout.isPending ? 'Đang đặt hàng...' : 'Đặt hàng & Thanh toán'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
