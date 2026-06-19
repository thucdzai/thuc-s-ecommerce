import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

// Component thuần hiển thị — nhận `page` và `totalPages` đã được Backend tính sẵn
// (BE thực hiện LIMIT/OFFSET và trả về tổng số trang). FE chỉ render điều khiển và
// phát ra số trang được chọn, không tự tính toán bất cứ điều gì.
export function PageControls({ page, totalPages, onPageChange }) {
  if (!totalPages || totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1
  );

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={() => page > 1 && onPageChange(page - 1)}
            className={page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
          />
        </PaginationItem>
        {pages.map((p, idx) => (
          <PaginationItem key={p}>
            {idx > 0 && p - pages[idx - 1] > 1 && <span className="px-2 text-muted-foreground">…</span>}
            <PaginationLink isActive={p === page} onClick={() => onPageChange(p)} className="cursor-pointer">
              {p}
            </PaginationLink>
          </PaginationItem>
        ))}
        <PaginationItem>
          <PaginationNext
            onClick={() => page < totalPages && onPageChange(page + 1)}
            className={page >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
