import { useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ImageOff, Loader2, Upload, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { uploadsApi } from '@/api';

// Trường nhập 1 ảnh — vừa cho phép dán URL (ảnh lưu ở nơi khác) vừa cho phép admin chọn file
// trực tiếp từ máy: file được tải lên product-service (POST /api/uploads/images), nhận lại
// đường dẫn '/api/uploads/files/<file>' rồi gán thẳng vào ô URL — phần còn lại của form (lưu
// sản phẩm) không cần biết ảnh đến từ đâu, vẫn chỉ là một chuỗi URL như trước.
export function ImageUploadField({ label, value, onChange, placeholder = 'https://...' }) {
  const inputRef = useRef(null);

  const mutation = useMutation({
    mutationFn: (file) => uploadsApi.images([file]),
    onSuccess: (result) => {
      const url = result?.urls?.[0];
      if (url) onChange(url);
      toast.success('Đã tải ảnh lên');
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Tải ảnh lên thất bại'),
  });

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) mutation.mutate(file);
  }

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium leading-none">{label}</p>}
      <div className="flex gap-2">
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        <Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => inputRef.current?.click()}>
          {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          <span className="ml-2 hidden sm:inline">Tải ảnh lên</span>
        </Button>
      </div>
      {value ? (
        <div className="relative inline-block">
          <img src={value} alt="" className="h-20 w-20 rounded-md border object-cover" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute -right-2 -top-2 rounded-full bg-background p-0.5 text-muted-foreground shadow ring-1 ring-border hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex h-20 w-20 items-center justify-center rounded-md border border-dashed text-muted-foreground">
          <ImageOff className="h-5 w-5" />
        </div>
      )}
    </div>
  );
}
