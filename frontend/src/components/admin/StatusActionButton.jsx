import { useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Nút chuyển trạng thái có xác nhận — mọi điều kiện hợp lệ (trạng thái nào được phép
// chuyển tới) đều do Backend quyết định, FE chỉ hiển thị nút cho các lựa chọn mà
// trang cha đã lọc theo *_ALLOWED_TRANSITIONS và gọi lại callback khi người dùng xác nhận.
export function StatusActionButton({ label, dialogTitle, dialogDescription, tone = 'primary', onConfirm, disabled }) {
  // AlertDialogAction (xem alert-dialog.jsx) chỉ là Button thường, không tự đóng dialog
  // như AlertDialogCancel — phải tự quản lý `open` và đóng ngay khi xác nhận, nếu không
  // dialog sẽ đứng yên và hiển thị lại với nội dung của bước chuyển kế tiếp sau khi
  // mutation thành công khiến người dùng tưởng đang bị hỏi xác nhận thêm lần nữa.
  const [open, setOpen] = useState(false);

  function handleConfirm() {
    setOpen(false);
    onConfirm();
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant={tone === 'primary' ? 'default' : 'outline'}
          className={cn(tone === 'caution' && 'border-destructive text-destructive hover:bg-destructive/10')}
          disabled={disabled}
        >
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{dialogTitle}</AlertDialogTitle>
          <AlertDialogDescription>{dialogDescription}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Đóng</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm}>Xác nhận</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
