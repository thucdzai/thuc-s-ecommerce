import { useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Upload, X } from 'lucide-react';
import { uploadsApi } from '@/api';

// Thư viện nhiều ảnh (vd: ảnh chi tiết sản phẩm) — admin chọn nhiều file cùng lúc, mỗi file
// được tải lên product-service và URL trả về được nối thêm vào danh sách hiện có (`urls`).
// Cùng cơ chế tải lên với ImageUploadField, chỉ khác là gom kết quả thành mảng thay vì 1 chuỗi.
export function MultiImageUploadField({ urls, onChange }) {
  const inputRef = useRef(null);

  const mutation = useMutation({
    mutationFn: (files) => uploadsApi.images(files).then((result) => result?.urls ?? []),
    onSuccess: (newUrls) => {
      onChange([...urls, ...newUrls]);
      toast.success(`Đã tải lên ${newUrls.length} ảnh`);
    },
    onError: (err) => toast.error(err?.response?.data?.message ?? 'Tải ảnh lên thất bại'),
  });

  function handleFileChange(e) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (files.length) mutation.mutate(files);
  }

  function removeAt(index) {
    onChange(urls.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-wrap gap-3">
      {urls.map((url, index) => (
        <div key={`${url}-${index}`} className="relative">
          <img src={url} alt="" className="h-20 w-20 rounded-md border object-cover" />
          <button
            type="button"
            onClick={() => removeAt(index)}
            className="absolute -right-2 -top-2 rounded-full bg-background p-0.5 text-muted-foreground shadow ring-1 ring-border hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
      <button
        type="button"
        disabled={mutation.isPending}
        onClick={() => inputRef.current?.click()}
        className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-md border border-dashed text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-60"
      >
        {mutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
        <span className="text-xs">Tải ảnh lên</span>
      </button>
    </div>
  );
}
