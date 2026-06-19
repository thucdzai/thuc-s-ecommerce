// Các giá trị này phải khớp chính xác với ORDER_STATUSES trong
// order-service/src/modules/orders/order.validation.js — sai lệch sẽ khiến
// Joi từ chối request lọc đơn hàng phía admin ("Dữ liệu đầu vào không hợp lệ").
export const ORDER_STATUS = {
  PENDING_PAYMENT: 'pending_payment',
  PAID: 'paid',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const ORDER_STATUS_LABEL = {
  pending_payment: 'Chờ thanh toán',
  paid: 'Đã thanh toán',
  processing: 'Đang xử lý',
  shipped: 'Đang giao hàng',
  completed: 'Hoàn tất',
  cancelled: 'Đã hủy',
};

export const ORDER_STATUS_VARIANT = {
  pending_payment: 'secondary',
  paid: 'default',
  processing: 'default',
  shipped: 'default',
  completed: 'outline',
  cancelled: 'destructive',
};

// Máy trạng thái đơn hàng — PHẢI khớp chính xác với ALLOWED_TRANSITIONS trong
// order-service/src/modules/orders/order.service.js. Dùng để giới hạn các lựa chọn
// "chuyển trạng thái" hợp lệ ngay trên UI, tránh admin chọn bước chuyển bị backend từ chối.
//   pending_payment ─┬─> paid ─> processing ─> shipped ─> completed
//                    └─> cancelled
//   paid ─> cancelled
// 'completed' và 'cancelled' là trạng thái cuối — không thể chuyển tiếp.
export const ORDER_ALLOWED_TRANSITIONS = {
  pending_payment: ['paid', 'cancelled'],
  paid: ['processing', 'cancelled'],
  processing: ['shipped'],
  shipped: ['completed'],
  completed: [],
  cancelled: [],
};

// Nhãn cho nút hành động (thể hiện ý "chuyển sang trạng thái này"), tách riêng khỏi
// ORDER_STATUS_LABEL vì label trạng thái mô tả kết quả ("Đã hủy") còn label nút cần
// thể hiện hành động ("Hủy đơn hàng"). Chỉ là copy hiển thị — KHÔNG chứa logic nghiệp vụ.
export const ORDER_STATUS_ACTION_LABEL = {
  paid: 'Xác nhận đã thanh toán',
  processing: 'Bắt đầu xử lý đơn',
  shipped: 'Xác nhận đã giao cho vận chuyển',
  completed: 'Xác nhận hoàn tất đơn hàng',
  cancelled: 'Hủy đơn hàng',
};

export const PAYMENT_STATUS_LABEL = {
  pending: 'Chờ thanh toán',
  success: 'Thành công',
  failed: 'Thất bại',
  cancelled: 'Đã hủy',
};

export const SHIPMENT_STATUS_LABEL = {
  pending: 'Chờ lấy hàng',
  picked_up: 'Đã lấy hàng',
  in_transit: 'Đang vận chuyển',
  delivered: 'Đã giao hàng',
  failed: 'Giao hàng thất bại',
  returned: 'Đã hoàn trả',
};

// Máy trạng thái vận đơn — PHẢI khớp chính xác với ALLOWED_TRANSITIONS trong
// shipping-service/src/modules/shipments/shipment.service.js. Dùng để giới hạn các lựa chọn
// "chuyển trạng thái" hợp lệ ngay trên UI, tránh admin chọn bước chuyển bị backend từ chối.
//   pending ─> picked_up ─> in_transit ─> delivered
//      └────────┴─────────────┴──────────> failed ─> returned
// 'delivered' và 'returned' là trạng thái cuối — không thể chuyển tiếp.
// Lưu ý nghiệp vụ: 'picked_up' tự động đẩy đơn hàng sang 'shipped', 'delivered' đẩy sang
// 'completed' — Order Service lắng nghe Kafka 'shipment.status_changed' để khách hàng thấy
// trạng thái đơn của họ tự cập nhật theo, không cần Admin đổi tay ở Order.
export const SHIPMENT_ALLOWED_TRANSITIONS = {
  pending: ['picked_up', 'failed'],
  picked_up: ['in_transit', 'failed'],
  in_transit: ['delivered', 'failed'],
  delivered: [],
  failed: ['returned'],
  returned: [],
};

// Nhãn cho nút hành động chuyển trạng thái vận đơn — chỉ là copy hiển thị, xem giải thích
// ở ORDER_STATUS_ACTION_LABEL.
export const SHIPMENT_STATUS_ACTION_LABEL = {
  picked_up: 'Xác nhận đã lấy hàng',
  in_transit: 'Xác nhận đang vận chuyển',
  delivered: 'Xác nhận đã giao hàng',
  failed: 'Báo giao hàng thất bại',
  returned: 'Xác nhận đã hoàn trả',
};

export const USER_ROLES = {
  ADMIN: 'admin',
  CUSTOMER: 'customer',
};

export const DEFAULT_PAGE_SIZE = 12;
export const ADMIN_PAGE_SIZE = 10;
