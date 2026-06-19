import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  LogOut,
  Package,
  Percent,
  Receipt,
  ShoppingBag,
  Truck,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api';
import { cn } from '@/lib/utils';

const navGroups = [
  {
    title: 'Tổng quan',
    items: [{ to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true }],
  },
  {
    title: 'Danh mục & Sản phẩm',
    items: [{ to: '/admin/products', label: 'Sản phẩm & Tồn kho', icon: Package }],
  },
  {
    title: 'Vận hành',
    items: [
      { to: '/admin/orders', label: 'Đơn hàng', icon: ShoppingBag },
      { to: '/admin/promotions', label: 'Khuyến mãi', icon: Percent },
      { to: '/admin/payments', label: 'Thanh toán', icon: Receipt },
      { to: '/admin/shipments', label: 'Vận chuyển', icon: Truck },
    ],
  },
  {
    title: 'Người dùng',
    items: [{ to: '/admin/users', label: 'Tài khoản', icon: Users }],
  },
];

function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card md:block">
      <div className="flex h-16 items-center border-b px-6">
        <Link to="/admin" className="text-lg font-bold tracking-tight">
          TTTN<span className="text-primary">Admin</span>
        </Link>
      </div>
      <nav className="flex flex-col gap-6 p-4">
        {navGroups.map((group) => (
          <div key={group.title}>
            <p className="mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground">{group.title}</p>
            <div className="flex flex-col gap-1">
              {group.items.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}

export function AdminLayout() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const clearSession = useAuthStore((s) => s.clearSession);

  async function handleLogout() {
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } catch {
      // bỏ qua lỗi logout phía server
    } finally {
      clearSession();
      navigate('/');
    }
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b bg-card px-6">
          <div>
            <p className="text-sm text-muted-foreground">Xin chào,</p>
            <p className="font-medium">{user?.fullName ?? user?.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link to="/">Về trang khách hàng</Link>
            </Button>
            <Button variant="ghost" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Đăng xuất
            </Button>
          </div>
        </header>
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
