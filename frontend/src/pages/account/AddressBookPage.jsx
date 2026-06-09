import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MapPin, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { usersApi } from '@/api';
import { useAuthStore } from '@/stores/authStore';

const emptyForm = { recipientName: '', phone: '', province: '', district: '', ward: '', streetDetail: '' };

function AddressFormDialog({ userId, address, trigger }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(address ?? emptyForm);

  const mutation = useMutation({
    mutationFn: (payload) =>
      address ? usersApi.updateAddress(userId, address.id, payload) : usersApi.createAddress(userId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses', userId] });
      toast.success(address ? 'Đã cập nhật địa chỉ' : 'Đã thêm địa chỉ mới');
      setOpen(false);
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Thao tác thất bại'),
  });

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleOpenChange(next) {
    setOpen(next);
    if (next) setForm(address ?? emptyForm);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{address ? 'Chỉnh sửa địa chỉ' : 'Thêm địa chỉ mới'}</DialogTitle>
        </DialogHeader>
        <form
          id="address-form"
          className="grid gap-3 py-2"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate(form);
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="recipientName">Người nhận</Label>
              <Input id="recipientName" name="recipientName" required value={form.recipientName} onChange={handleChange} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Số điện thoại</Label>
              <Input id="phone" name="phone" required value={form.phone} onChange={handleChange} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="province">Tỉnh/Thành phố</Label>
              <Input id="province" name="province" required value={form.province} onChange={handleChange} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="district">Quận/Huyện</Label>
              <Input id="district" name="district" required value={form.district} onChange={handleChange} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ward">Phường/Xã</Label>
              <Input id="ward" name="ward" required value={form.ward} onChange={handleChange} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="streetDetail">Địa chỉ cụ thể</Label>
            <Input id="streetDetail" name="streetDetail" required value={form.streetDetail} onChange={handleChange} placeholder="Số nhà, tên đường..." />
          </div>
        </form>
        <DialogFooter>
          <Button type="submit" form="address-form" disabled={mutation.isPending}>
            {mutation.isPending ? 'Đang lưu...' : 'Lưu địa chỉ'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddressCard({ userId, address }) {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => usersApi.deleteAddress(userId, address.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses', userId] });
      toast.success('Đã xóa địa chỉ');
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Xóa địa chỉ thất bại'),
  });

  const setDefaultMutation = useMutation({
    mutationFn: () => usersApi.setDefaultAddress(userId, address.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses', userId] });
      toast.success('Đã đặt làm địa chỉ mặc định');
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Thao tác thất bại'),
  });

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <MapPin className="mt-1 h-5 w-5 shrink-0 text-muted-foreground" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{address.recipientName}</p>
              <span className="text-sm text-muted-foreground">{address.phone}</span>
              {address.isDefault && (
                <Badge variant="default" className="gap-1">
                  <Star className="h-3 w-3" /> Mặc định
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {[address.streetDetail, address.ward, address.district, address.province].filter(Boolean).join(', ')}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2 self-end sm:self-start">
          {!address.isDefault && (
            <Button variant="outline" size="sm" onClick={() => setDefaultMutation.mutate()} disabled={setDefaultMutation.isPending}>
              <Star className="mr-1 h-4 w-4" /> Đặt mặc định
            </Button>
          )}
          <AddressFormDialog
            userId={userId}
            address={address}
            trigger={
              <Button variant="outline" size="sm">
                <Pencil className="mr-1 h-4 w-4" /> Sửa
              </Button>
            }
          />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                <Trash2 className="mr-1 h-4 w-4" /> Xóa
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Xóa địa chỉ này?</AlertDialogTitle>
                <AlertDialogDescription>Hành động này không thể hoàn tác.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Hủy</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteMutation.mutate()}>Xóa</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AddressBookPage() {
  const user = useAuthStore((s) => s.user);
  const userId = user?.id;

  const { data: addresses, isLoading, isError, error } = useQuery({
    queryKey: ['addresses', userId],
    queryFn: () => usersApi.getAddresses(userId),
    enabled: !!userId,
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Sổ địa chỉ</h1>
          <p className="text-muted-foreground">Quản lý địa chỉ giao hàng của bạn</p>
        </div>
        <AddressFormDialog
          userId={userId}
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Thêm địa chỉ
            </Button>
          }
        />
      </div>

      {isLoading && <LoadingState />}
      {isError && <ErrorState error={error} message="Không thể tải sổ địa chỉ" />}
      {!isLoading && !isError && (!addresses || addresses.length === 0) && (
        <EmptyState title="Chưa có địa chỉ nào" description="Thêm địa chỉ để thuận tiện cho việc đặt hàng và giao hàng." />
      )}

      <div className="space-y-3">
        {addresses?.map((address) => (
          <AddressCard key={address.id} userId={userId} address={address} />
        ))}
      </div>
    </div>
  );
}
