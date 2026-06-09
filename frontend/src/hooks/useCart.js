import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cartApi } from '@/api';
import { useAuthStore } from '@/stores/authStore';

const CART_KEY = ['cart'];

// Toàn bộ tổng tiền/số lượng/giá đều do Cart Service trả về sẵn — hook này chỉ
// fetch & cache, không tính toán lại bất kỳ con số nào ở phía client.
export function useCart() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  return useQuery({
    queryKey: CART_KEY,
    queryFn: cartApi.get,
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
}

function useCartMutation(mutationFn, successMessage) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CART_KEY });
      if (successMessage) toast.success(successMessage);
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message ?? 'Thao tác với giỏ hàng thất bại');
    },
  });
}

export function useAddToCart() {
  return useCartMutation((payload) => cartApi.addItem(payload), 'Đã thêm vào giỏ hàng');
}

export function useUpdateCartItem() {
  return useCartMutation(({ skuId, quantity }) => cartApi.updateItem(skuId, { quantity }));
}

export function useRemoveCartItem() {
  return useCartMutation((skuId) => cartApi.removeItem(skuId), 'Đã xóa sản phẩm khỏi giỏ hàng');
}

export function useClearCart() {
  return useCartMutation(() => cartApi.clear(), 'Đã xóa toàn bộ giỏ hàng');
}
