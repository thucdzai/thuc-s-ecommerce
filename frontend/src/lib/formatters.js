// Các hàm format chỉ phục vụ HIỂN THỊ — không thực hiện bất kỳ tính toán nghiệp vụ nào
// (tổng tiền, giảm giá, phân trang... đều do Backend trả về sẵn).

export function formatCurrency(value) {
  const number = Number(value ?? 0);
  return number.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
}

export function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
