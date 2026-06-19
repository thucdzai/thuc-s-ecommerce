-- =====================================================================
-- PAYMENT SERVICE — payment_db
-- Tích hợp cổng thanh toán VNPay: tạo URL thanh toán đã ký số (POST /vnpay/create-url) và
-- xác nhận kết quả qua webhook IPN (GET /vnpay/ipn). Không có khóa ngoại trỏ sang Order Service
-- (khác DB) — order_id/order_code chỉ là tham chiếu lỏng, đồng bộ qua Kafka 'order-events'.
-- =====================================================================

-- Khai báo charset của kết nối là utf8mb4 TRƯỚC khi insert dữ liệu mẫu có dấu tiếng Việt,
-- tránh lỗi double-encoding (mojibake) khi docker-entrypoint-initdb.d nạp file bằng client charset latin1.
SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS payment_db;
USE payment_db;

-- ---------------------------------------------------------------------
-- order_snapshots: "bản sao đọc" đơn hàng, đồng bộ liên tục qua Kafka 'order-events'
-- (consumer subscribe với fromBeginning: true nên tự lấp đầy khi mới khởi động). Đây là nguồn
-- DUY NHẤT Payment Service tin để biết "đơn này của ai, tổng tiền bao nhiêu, đang chờ thanh toán
-- hay không" khi tạo URL VNPay — không gọi HTTP đồng bộ sang Order Service, giữ đúng triết lý
-- giảm coupling đã áp dụng xuyên suốt dự án (Cart/Warehouse/Order đều dùng read-model qua Kafka).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_snapshots (
    order_id        INT PRIMARY KEY,
    order_code      VARCHAR(32) NOT NULL UNIQUE,
    user_id         INT NOT NULL,
    total_amount    DECIMAL(12, 2) NOT NULL,
    status          ENUM('pending_payment', 'paid', 'processing', 'shipped', 'completed', 'cancelled')
                        NOT NULL DEFAULT 'pending_payment',
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_order_snapshots_user (user_id),
    INDEX idx_order_snapshots_status (status)
);

-- ---------------------------------------------------------------------
-- payment_transactions: 1 dòng = 1 lần khách bấm "Thanh toán" cho 1 đơn (txn_ref riêng biệt —
-- khách có thể tạo lại nhiều lần nếu lần trước hết hạn/thất bại). status bắt đầu ở 'pending' khi
-- tạo URL, chỉ được cập nhật thành 'success'/'failed' DUY NHẤT MỘT LẦN bởi webhook IPN đã xác thực
-- chữ ký — đây là nguồn sự thật (source of truth) cho toàn bộ hệ thống về kết quả thanh toán.
-- provider_response lưu nguyên văn dữ liệu VNPay trả về (phục vụ đối soát/tra soát khiếu nại sau này).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_transactions (
    id                          INT AUTO_INCREMENT PRIMARY KEY,
    order_id                    INT NOT NULL,
    order_code                  VARCHAR(32) NOT NULL,
    user_id                     INT NOT NULL,
    amount                      DECIMAL(12, 2) NOT NULL,
    provider                    VARCHAR(20) NOT NULL DEFAULT 'vnpay',
    txn_ref                     VARCHAR(64) NOT NULL UNIQUE,
    status                      ENUM('pending', 'success', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
    bank_code                   VARCHAR(20) NULL,
    provider_transaction_id     VARCHAR(64) NULL,
    provider_response           JSON NULL,
    paid_at                     DATETIME NULL,
    expires_at                  DATETIME NULL,
    created_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_payment_tx_order_code (order_code),
    INDEX idx_payment_tx_user (user_id),
    INDEX idx_payment_tx_status (status)
);
