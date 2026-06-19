import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authApi } from '@/api';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [form, setForm] = useState({ newPassword: '', confirm: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-xl font-semibold">Link không hợp lệ</h1>
        <p className="text-sm text-muted-foreground">Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.</p>
        <Link to="/forgot-password" className="text-sm font-medium underline underline-offset-4">
          Yêu cầu link mới
        </Link>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.newPassword !== form.confirm) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await authApi.resetPassword(token, form.newPassword);
      toast.success('Đặt lại mật khẩu thành công');
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Link không hợp lệ hoặc đã hết hạn');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold">Đặt lại mật khẩu</h1>
        <p className="text-sm text-muted-foreground">Nhập mật khẩu mới cho tài khoản của bạn</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="newPassword">Mật khẩu mới</Label>
          <Input
            id="newPassword"
            type="password"
            required
            minLength={6}
            value={form.newPassword}
            onChange={(e) => setForm((p) => ({ ...p, newPassword: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Xác nhận mật khẩu</Label>
          <Input
            id="confirm"
            type="password"
            required
            value={form.confirm}
            onChange={(e) => setForm((p) => ({ ...p, confirm: e.target.value }))}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
        </Button>
      </form>
    </div>
  );
}
