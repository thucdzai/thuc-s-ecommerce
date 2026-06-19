import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authApi } from '@/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err?.response?.data?.message ?? 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Kiểm tra email của bạn</h1>
          <p className="text-sm text-muted-foreground">
            Nếu email <strong>{email}</strong> tồn tại trong hệ thống, chúng tôi đã gửi link đặt lại mật khẩu.
            Link có hiệu lực trong 15 phút.
          </p>
        </div>
        <Link to="/login" className="text-sm font-medium underline underline-offset-4">
          Quay lại đăng nhập
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold">Quên mật khẩu</h1>
        <p className="text-sm text-muted-foreground">
          Nhập email tài khoản, chúng tôi sẽ gửi link đặt lại mật khẩu
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ban@email.com"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Đang gửi...' : 'Gửi link đặt lại mật khẩu'}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        <Link to="/login" className="font-medium text-foreground underline underline-offset-4">
          Quay lại đăng nhập
        </Link>
      </p>
    </div>
  );
}
