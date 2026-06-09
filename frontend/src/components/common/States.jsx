import { AlertCircle, Inbox, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function LoadingState({ label = 'Đang tải dữ liệu...' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function ErrorState({ message = 'Đã có lỗi xảy ra. Vui lòng thử lại.', error }) {
  const detail = error?.response?.data?.message ?? error?.message;
  return (
    <Alert variant="destructive" className="my-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{message}</AlertTitle>
      {detail && <AlertDescription>{detail}</AlertDescription>}
    </Alert>
  );
}

export function EmptyState({ title = 'Không có dữ liệu', description, icon: Icon = Inbox, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground">
      <Icon className="h-10 w-10" />
      <p className="text-base font-medium text-foreground">{title}</p>
      {description && <p className="max-w-sm text-sm">{description}</p>}
      {action}
    </div>
  );
}
