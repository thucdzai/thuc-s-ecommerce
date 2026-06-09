import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Camera, Mail, Phone, Shield, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { LoadingState, ErrorState } from '@/components/common/States';
import { usersApi } from '@/api';
import { useAuthStore } from '@/stores/authStore';

const STATUS_BADGE = {
  active: { label: 'Đang hoạt động', variant: 'outline' },
  banned: { label: 'Đã bị khóa', variant: 'destructive' },
};

export default function ProfilePage() {
  const setUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);

  const { data: profile, isLoading, isError, error } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const data = await usersApi.getProfile();
      setUser(data);
      return data;
    },
  });

  const [form, setForm] = useState({ fullName: '', phone: '', email: '' });

  useEffect(() => {
    if (profile) {
      setForm({
        fullName: profile.fullName ?? '',
        phone: profile.phone ?? '',
        email: profile.email ?? '',
      });
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: (data) => usersApi.updateProfile(data),
    onSuccess: (updated) => {
      setUser(updated);
      queryClient.setQueryData(['profile'], updated);
      toast.success('Cập nhật hồ sơ thành công');
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Cập nhật thất bại'),
  });

  const avatarMutation = useMutation({
    mutationFn: (file) => usersApi.uploadAvatar(file),
    onSuccess: (updated) => {
      setUser(updated);
      queryClient.setQueryData(['profile'], updated);
      toast.success('Đã cập nhật ảnh đại diện');
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Tải ảnh lên thất bại'),
  });

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (file) avatarMutation.mutate(file);
    e.target.value = '';
  }

  function handleSubmit(e) {
    e.preventDefault();
    const payload = {};
    if (form.fullName !== profile?.fullName) payload.fullName = form.fullName;
    if ((form.phone || null) !== (profile?.phone || null)) payload.phone = form.phone;
    if (form.email !== profile?.email) payload.email = form.email;
    if (Object.keys(payload).length === 0) {
      toast.info('Không có thay đổi nào để lưu');
      return;
    }
    updateMutation.mutate(payload);
  }

  if (isLoading) return <LoadingState />;
  if (isError) return <ErrorState error={error} message="Không thể tải hồ sơ" />;

  const initials = (profile?.fullName ?? profile?.email ?? '?').slice(0, 2).toUpperCase();
  const isAdmin = Array.isArray(profile?.roles) && profile.roles.includes('ADMIN');
  const statusInfo = STATUS_BADGE[profile?.status] ?? STATUS_BADGE.active;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Hồ sơ cá nhân</h1>
        <p className="text-muted-foreground">Chỉnh sửa thông tin tài khoản của bạn</p>
      </div>

      {/* Avatar + tên + badges */}
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-6 sm:flex-row sm:items-start">
          <div className="relative shrink-0">
            <Avatar className="h-20 w-20">
              {profile?.avatarUrl && <AvatarImage src={profile.avatarUrl} alt={profile.fullName} />}
              <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={avatarMutation.isPending}
              className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow transition-opacity hover:opacity-90 disabled:opacity-50"
              title="Đổi ảnh đại diện"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
          <div className="text-center sm:text-left">
            <p className="text-xl font-semibold">{profile?.fullName}</p>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
              <Badge variant={isAdmin ? 'default' : 'secondary'} className="gap-1">
                <Shield className="h-3 w-3" />
                {isAdmin ? 'Quản trị viên' : 'Khách hàng'}
              </Badge>
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form chỉnh sửa */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserCircle className="h-4 w-4" />
            Chỉnh sửa thông tin
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Họ và tên</Label>
              <Input
                id="fullName"
                value={form.fullName}
                onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                placeholder="Nhập họ và tên"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />Số điện thoại
                </Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="Nhập số điện thoại"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="Nhập email"
                />
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Mã người dùng: #{profile?.id}</p>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
