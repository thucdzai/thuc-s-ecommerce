import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Package, Percent, Receipt, ShoppingBag, Truck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/common/States';
import { ordersApi, paymentsApi, productsApi, shippingApi } from '@/api';

// Dashboard chỉ tổng hợp lại các con số `pagination.totalItems` mà từng service đã tính sẵn —
// không cộng dồn / suy luận thêm bất kỳ số liệu nghiệp vụ nào ở phía client.
function useCount(key, queryFn) {
  return useQuery({ queryKey: key, queryFn, select: (data) => data?.pagination?.totalItems ?? data?.items?.length ?? 0 });
}

function StatCard({ icon: Icon, label, value, isLoading, to }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <div className="rounded-lg bg-primary/10 p-3 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold">{isLoading ? '—' : value}</p>
        </div>
        {to && (
          <Button variant="ghost" size="icon" asChild>
            <Link to={to}><ArrowRight className="h-4 w-4" /></Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

const quickLinks = [
  { to: '/admin/products', label: 'Sản phẩm & Tồn kho', icon: Package, desc: 'Thêm, sửa, xóa sản phẩm, biến thể và điều chỉnh tồn kho' },
  { to: '/admin/orders', label: 'Quản lý đơn hàng', icon: ShoppingBag, desc: 'Xử lý và cập nhật trạng thái đơn hàng' },
  { to: '/admin/promotions', label: 'Quản lý khuyến mãi', icon: Percent, desc: 'Tạo và quản lý mã giảm giá' },
  { to: '/admin/payments', label: 'Đối soát thanh toán', icon: Receipt, desc: 'Theo dõi giao dịch VNPay' },
  { to: '/admin/shipments', label: 'Quản lý vận chuyển', icon: Truck, desc: 'Theo dõi và cập nhật trạng thái vận đơn' },
];

export default function DashboardPage() {
  const orders = useCount(['admin-orders-count'], () => ordersApi.adminList({ page: 1, limit: 1 }));
  const products = useCount(['admin-products-count'], () => productsApi.list({ page: 1, limit: 1 }));
  const payments = useCount(['admin-payments-count'], () => paymentsApi.adminList({ page: 1, limit: 1 }));
  const shipments = useCount(['admin-shipments-count'], () => shippingApi.adminList({ page: 1, limit: 1 }));

  const isLoading = orders.isLoading || products.isLoading || payments.isLoading || shipments.isLoading;
  if (isLoading) return <LoadingState />;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Tổng quan</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={ShoppingBag} label="Tổng số đơn hàng" value={orders.data} to="/admin/orders" />
        <StatCard icon={Package} label="Tổng số sản phẩm" value={products.data} to="/admin/products" />
        <StatCard icon={Receipt} label="Giao dịch thanh toán" value={payments.data} to="/admin/payments" />
        <StatCard icon={Truck} label="Vận đơn" value={shipments.data} to="/admin/shipments" />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Truy cập nhanh</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map(({ to, label, icon: Icon, desc }) => (
            <Link key={to} to={to}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardContent className="space-y-2">
                  <Icon className="h-6 w-6 text-primary" />
                  <p className="font-medium">{label}</p>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
