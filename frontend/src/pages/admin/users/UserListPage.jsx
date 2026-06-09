import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Search, ShieldOff, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { PageControls } from '@/components/common/PageControls';
import { LoadingState, ErrorState, EmptyState } from '@/components/common/States';
import { formatDateTime } from '@/lib/formatters';
import { usersApi } from '@/api';

const STATUS_BADGE = {
  active: { label: 'Hoạt động', variant: 'outline' },
  banned: { label: 'Đã khóa', variant: 'destructive' },
};

function BanButton({ user }) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const isBanned = user.status === 'banned';

  const mutation = useMutation({
    mutationFn: () => isBanned ? usersApi.adminUnban(user.id) : usersApi.adminBan(user.id),
    onSuccess: () => {
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(isBanned ? 'Đã mở khóa tài khoản' : 'Đã khóa tài khoản');
    },
    onError: (err) => {
      setOpen(false);
      toast.error(err?.response?.data?.message ?? 'Thao tác thất bại');
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={isBanned ? 'text-emerald-600 hover:text-emerald-600' : 'text-destructive hover:text-destructive'}
          title={isBanned ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
        >
          {isBanned ? <ShieldCheck className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isBanned ? `Mở khóa tài khoản "${user.email}"?` : `Khóa tài khoản "${user.email}"?`}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isBanned
              ? 'Người dùng sẽ có thể đăng nhập và sử dụng hệ thống trở lại.'
              : 'Người dùng sẽ không thể đăng nhập cho đến khi được mở khóa.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Hủy</AlertDialogCancel>
          <AlertDialogAction onClick={() => mutation.mutate()}>
            {isBanned ? 'Mở khóa' : 'Khóa tài khoản'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function AdminUserListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  const params = { page, limit: 20, q: query || undefined };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin-users', params],
    queryFn: () => usersApi.adminList(params),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Quản lý người dùng</h1>
        <p className="text-muted-foreground">Xem danh sách và khóa/mở khóa tài khoản</p>
      </div>

      <form
        className="flex max-w-sm gap-2"
        onSubmit={(e) => { e.preventDefault(); setPage(1); setQuery(search.trim()); }}
      >
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo tên hoặc email..."
        />
        <Button type="submit" variant="secondary">
          <Search className="h-4 w-4" />
        </Button>
      </form>

      {isLoading && <LoadingState />}
      {isError && <ErrorState error={error} message="Không thể tải danh sách người dùng" />}
      {!isLoading && !isError && data?.items?.length === 0 && (
        <EmptyState title="Không tìm thấy người dùng nào" />
      )}

      {data?.items?.length > 0 && (
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Người dùng</TableHead>
                <TableHead>Số điện thoại</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày đăng ký</TableHead>
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((user) => {
                const initials = (user.fullName ?? user.email ?? '?').slice(0, 2).toUpperCase();
                const statusInfo = STATUS_BADGE[user.status] ?? STATUS_BADGE.active;
                return (
                  <TableRow key={user.id} className={user.status === 'banned' ? 'bg-muted/50 text-muted-foreground' : ''}>
                    <TableCell>
                      <Avatar className="h-8 w-8">
                        {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.fullName} />}
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{user.fullName ?? '—'}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </TableCell>
                    <TableCell>{user.phone ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{formatDateTime(user.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <BanButton user={user} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex justify-center">
        <PageControls
          page={data?.pagination?.page ?? page}
          totalPages={data?.pagination?.totalPages ?? 1}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
