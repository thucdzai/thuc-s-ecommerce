-- =====================================================================
-- ORDER & PROMOTION SERVICE — order_db
-- Quản lý đơn hàng (orders/order_items) và khuyến mãi (promotions). Order Service ĐIỀU PHỐI
-- (orchestrate) toàn bộ luồng checkout: xác nhận giá từ "bản sao đọc" sản phẩm (đồng bộ qua
-- Kafka 'product-events', cùng thiết kế với Cart Service), gọi sang Warehouse Service để giữ
-- chỗ tồn kho, áp dụng khuyến mãi và tính tổng tiền cuối cùng — KHÉP KÍN hoàn toàn ở Backend.
-- Không có khóa ngoại trỏ sang Product/Warehouse Service (khác DB) — sku_id chỉ là tham chiếu lỏng.
-- =====================================================================

-- Khai báo charset của kết nối là utf8mb4 TRƯỚC khi insert dữ liệu mẫu có dấu tiếng Việt,
-- tránh lỗi double-encoding (mojibake) khi docker-entrypoint-initdb.d nạp file bằng client charset latin1.
SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS order_db;
USE order_db;

-- ---------------------------------------------------------------------
-- promotions: mã khuyến mãi do Admin tạo — áp dụng tại thời điểm checkout.
-- discount_type='percentage' dùng kèm discount_value (vd 10 = giảm 10%) và có thể giới hạn
-- số tiền giảm tối đa qua max_discount_amount; discount_type='fixed' giảm thẳng discount_value (đồng).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS promotions (
    id                      INT AUTO_INCREMENT PRIMARY KEY,
    code                    VARCHAR(32) NOT NULL UNIQUE,
    description             VARCHAR(255) NULL,
    discount_type           ENUM('percentage', 'fixed') NOT NULL,
    discount_value          DECIMAL(12, 2) NOT NULL,
    max_discount_amount     DECIMAL(12, 2) NULL,
    min_order_amount        DECIMAL(12, 2) NOT NULL DEFAULT 0,
    usage_limit             INT NULL,
    used_count              INT NOT NULL DEFAULT 0,
    starts_at               DATETIME NOT NULL,
    ends_at                 DATETIME NOT NULL,
    status                  ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_promotions_status (status)
);

-- ---------------------------------------------------------------------
-- orders: 1 đơn hàng = 1 lần checkout. Lưu "ảnh chụp" địa chỉ giao hàng và số tiền đã chốt
-- tại thời điểm đặt — để lịch sử đơn không đổi dù sau này khách sửa địa chỉ hay sản phẩm đổi giá.
-- order_code là chuỗi duy nhất, dễ đọc, dùng làm `orderId` khi gọi Warehouse Service (lock/release/deduct).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    order_code          VARCHAR(32) NOT NULL UNIQUE,
    user_id             INT NOT NULL,
    status              ENUM('pending_payment', 'paid', 'processing', 'shipped', 'completed', 'cancelled')
                            NOT NULL DEFAULT 'pending_payment',
    subtotal_amount     DECIMAL(12, 2) NOT NULL,
    discount_amount     DECIMAL(12, 2) NOT NULL DEFAULT 0,
    shipping_fee        DECIMAL(12, 2) NOT NULL DEFAULT 0,
    total_amount        DECIMAL(12, 2) NOT NULL,
    promotion_id        INT NULL,
    promotion_code      VARCHAR(32) NULL,
    recipient_name      VARCHAR(120) NOT NULL,
    recipient_phone     VARCHAR(20) NOT NULL,
    shipping_address    VARCHAR(500) NOT NULL,
    note                VARCHAR(255) NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_orders_user (user_id),
    INDEX idx_orders_status (status),
    INDEX idx_orders_created (created_at),
    CONSTRAINT fk_orders_promotion FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE SET NULL
);

-- ---------------------------------------------------------------------
-- order_items: từng dòng SKU trong đơn — chụp lại tên/giá/mã SKU TẠI THỜI ĐIỂM MUA
-- (đúng yêu cầu kiến trúc "price/name snapshot at purchase time"), độc lập với product_snapshots
-- vì product_snapshots còn tiếp tục được Kafka cập nhật theo thời gian thực sau khi đơn đã chốt.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    order_id        INT NOT NULL,
    sku_id          INT NOT NULL,
    sku_code        VARCHAR(64) NOT NULL,
    product_id      INT NOT NULL,
    product_name    VARCHAR(255) NOT NULL,
    price           DECIMAL(12, 2) NOT NULL,
    quantity        INT NOT NULL,
    line_total      DECIMAL(12, 2) NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_order_items_order (order_id),
    INDEX idx_order_items_sku (sku_id),
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- product_snapshots: "bản sao đọc" tên/giá sản phẩm, đồng bộ liên tục qua Kafka
-- (consumer subscribe 'product-events' với fromBeginning: true nên tự lấp đầy khi mới khởi động).
-- Đây là nguồn DUY NHẤT Order Service tin để lấy giá lúc checkout — không gọi HTTP đồng bộ
-- sang Product Service, giữ đúng triết lý giảm coupling đã áp dụng cho Cart/Warehouse Service.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_snapshots (
    sku_id              INT PRIMARY KEY,
    sku_code            VARCHAR(64) NOT NULL,
    product_id          INT NOT NULL,
    product_name        VARCHAR(255) NOT NULL,
    price               DECIMAL(12, 2) NOT NULL,
    compare_at_price    DECIMAL(12, 2) NULL,
    status              ENUM('draft', 'active', 'discontinued') NOT NULL DEFAULT 'active',
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_product_snapshots_product (product_id),
    INDEX idx_product_snapshots_status (status)
);

-- ---------------------------------------------------------------------
-- Dữ liệu mẫu: 2 mã khuyến mãi để test ngay sau khi service khởi động (không cần chờ Admin tạo).
-- Cột & giá trị: code, description, discount_type, discount_value, max_discount_amount,
-- min_order_amount, usage_limit, starts_at, ends_at, status  (10 cột — 10 giá trị mỗi dòng).
-- ---------------------------------------------------------------------
INSERT INTO promotions
    (code, description, discount_type, discount_value, max_discount_amount, min_order_amount, usage_limit, starts_at, ends_at, status)
VALUES
    ('WELCOME10', 'Giảm 10% cho đơn từ 200.000đ, tối đa 50.000đ', 'percentage', 10.00, 50000.00, 200000.00, 100, '2026-01-01 00:00:00', '2026-12-31 23:59:59', 'active'),
    ('FREESHIP30', 'Giảm thẳng 30.000đ cho đơn từ 300.000đ', 'fixed', 30000.00, NULL, 300000.00, NULL, '2026-01-01 00:00:00', '2026-12-31 23:59:59', 'active'),
    ('EXPIRED5', 'Mã đã hết hạn — dùng để kiểm thử trường hợp từ chối áp dụng', 'percentage', 5.00, NULL, 0.00, NULL, '2025-01-01 00:00:00', '2025-12-31 23:59:59', 'inactive');
