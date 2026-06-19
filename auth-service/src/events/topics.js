module.exports = {
    // Topic do chính Auth Service phát ra khi có tài khoản mới đăng ký — Notification Service
    // subscribe để gửi email chào mừng (xem authEvents.publisher.js và
    // notification-service/src/events/authEvents.consumer.js). Đặt tên theo đúng quy ước
    // "<service>-events" mà Product/Order/Payment/Shipping/Warehouse Service đang dùng.
    AUTH_EVENTS: 'auth-events',
};
