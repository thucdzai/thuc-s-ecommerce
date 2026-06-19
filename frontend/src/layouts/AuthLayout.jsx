import { Link, Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted/30 p-4">
      <Link to="/" className="text-2xl font-bold tracking-tight">
        TTTN<span className="text-primary">Shop</span>
      </Link>
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
        <Outlet />
      </div>
    </div>
  );
}
