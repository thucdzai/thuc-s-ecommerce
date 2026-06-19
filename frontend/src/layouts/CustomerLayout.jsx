import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Menu, Package, MapPin, Receipt, Search, ShoppingCart, Truck, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/authStore';
import { useCart } from '@/hooks/useCart';
import { authApi } from '@/api';
import { cn } from '@/lib/utils';

const navLinks = [
  { to: '/', label: 'Trang chủ', end: true },
  { to: '/products', label: 'Sản phẩm' },
];

function CartButton() {
  const { data: cart } = useCart();
  const itemCount = cart?.items?.length ?? 0;

  return (
    <Button variant="ghost" size="icon" asChild className="relative">
      <Link to="/cart" aria-label="Giỏ hàng">
        <ShoppingCart className="h-5 w-5" />
        {itemCount > 0 && (
          <Badge className="absolute -right-1 -top-1 h-5 min-w-5 justify-center rounded-full px-1 text-xs">
            {itemCount}
          </Badge>
        )}
      </Link>
    </Button>
  );
}

function UserMenu() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const clearSession = useAuthStore((s) => s.clearSession);
  const isAdmin = useAuthStore((s) => s.isAdmin());

  async function handleLogout() {
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } catch {
      // bỏ qua lỗi logout phía server, vẫn xóa phiên cục bộ
    } finally {
      clearSession();
      navigate('/');
    }
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="ghost" asChild>
          <Link to="/login">Đăng nhập</Link>
        </Button>
        <Button asChild>
          <Link to="/register">Đăng ký</Link>
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2">
          <User className="h-4 w-4" />
          {user.fullName ?? user.email}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Tài khoản của tôi</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate('/account/profile')}>
          <User className="mr-2 h-4 w-4" />Hồ sơ
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/account/addresses')}>
          <MapPin className="mr-2 h-4 w-4" />Sổ địa chỉ
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/account/orders')}>
          <Package className="mr-2 h-4 w-4" />Đơn hàng của tôi
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/account/payments')}>
          <Receipt className="mr-2 h-4 w-4" />Lịch sử thanh toán
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/account/shipments')}>
          <Truck className="mr-2 h-4 w-4" />Vận chuyển của tôi
        </DropdownMenuItem>
        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/admin')}>
              Trang quản trị
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} variant="destructive">
          <LogOut className="mr-2 h-4 w-4" />Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SearchBar({ className }) {
  const navigate = useNavigate();
  const [value, setValue] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    navigate(value.trim() ? `/products?q=${encodeURIComponent(value.trim())}` : '/products');
  }

  return (
    <form onSubmit={handleSubmit} className={cn('relative w-full max-w-md', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Tìm kiếm sản phẩm..."
        className="pl-9"
      />
    </form>
  );
}

export function CustomerLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-4">
              <nav className="mt-8 flex flex-col gap-2">
                {navLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.end}
                    className={({ isActive }) =>
                      cn('rounded-md px-3 py-2 text-sm font-medium', isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground')
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
              </nav>
            </SheetContent>
          </Sheet>

          <Link to="/" className="text-lg font-bold tracking-tight">
            TTTN<span className="text-primary">Shop</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                    isActive ? 'text-foreground' : 'text-muted-foreground'
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <SearchBar className="ml-auto hidden sm:block" />

          <div className="ml-auto flex items-center gap-1 sm:ml-0">
            <CartButton />
            <UserMenu />
          </div>
        </div>
        <div className="border-t px-4 py-2 sm:hidden">
          <SearchBar />
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t py-8 text-sm text-muted-foreground">
        <div className="mx-auto max-w-7xl px-4">
          <p>© {new Date().getFullYear()} TTTN Shop</p>
        </div>
      </footer>
    </div>
  );
}
