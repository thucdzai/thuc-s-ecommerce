-- =====================================================================
-- SHIPPING SERVICE — shipping_db
-- Tính phí vận chuyển, tự động tạo vận đơn (mock GHTK/GHN) khi đơn chuyển sang 'processing',
-- theo dõi trạng thái giao hàng và báo ngược kết quả cho Order Service qua Kafka 'shipping-events'.
-- Không có khóa ngoại trỏ sang Order Service (khác DB) — order_id/order_code chỉ là tham chiếu
-- lỏng, đồng bộ qua Kafka 'order-events' (cùng triết lý với Payment Service).
-- =====================================================================

-- Khai báo charset của kết nối là utf8mb4 TRƯỚC khi đọc file có dấu tiếng Việt, tránh lỗi
-- double-encoding (mojibake) khi docker-entrypoint-initdb.d nạp file bằng client charset latin1.
SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS shipping_db;
USE shipping_db;

-- ---------------------------------------------------------------------
-- order_snapshots: "bản sao đọc" đơn hàng, đồng bộ liên tục qua Kafka 'order-events'
-- (consumer subscribe với fromBeginning: true nên tự lấp đầy khi mới khởi động). Lưu thêm thông
-- tin người nhận + số lượng sản phẩm — 2 thứ Payment Service không cần nhưng Shipping Service
-- BẮT BUỘC phải có để tạo vận đơn (giao cho ai, địa chỉ nào, ước lượng cân nặng bao nhiêu) mà
-- không phải gọi HTTP đồng bộ sang Order Service.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_snapshots (
    order_id            INT PRIMARY KEY,
    order_code          VARCHAR(32) NOT NULL UNIQUE,
    user_id             INT NOT NULL,
    total_amount        DECIMAL(12, 2) NOT NULL,
    item_count          INT NOT NULL DEFAULT 0,
    recipient_name      VARCHAR(120) NOT NULL DEFAULT '',
    recipient_phone     VARCHAR(20) NOT NULL DEFAULT '',
    shipping_address    VARCHAR(255) NOT NULL DEFAULT '',
    status              ENUM('pending_payment', 'paid', 'processing', 'shipped', 'completed', 'cancelled')
                            NOT NULL DEFAULT 'pending_payment',
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_order_snapshots_user (user_id),
    INDEX idx_order_snapshots_status (status)
);

-- ---------------------------------------------------------------------
-- shipments: 1 dòng = 1 vận đơn cho 1 đơn hàng (order_code UNIQUE — mỗi đơn chỉ giao 1 lần,
-- không tách nhiều kiện). Được Shipping Service TỰ TẠO khi nhận sự kiện đơn chuyển 'processing'
-- (xem orderSnapshot.service.js), KHÔNG cần Admin tạo tay. carrier/tracking_code là dữ liệu mock
-- (chưa tích hợp API thật của GHTK/GHN — xem utils/carrier.js) nhưng giữ đúng hình dạng dữ liệu
-- mà 1 lần tích hợp thật sẽ trả về.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shipments (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    order_id            INT NOT NULL,
    order_code          VARCHAR(32) NOT NULL UNIQUE,
    user_id             INT NOT NULL,
    carrier             VARCHAR(20) NOT NULL,
    tracking_code       VARCHAR(64) NOT NULL UNIQUE,
    recipient_name      VARCHAR(120) NOT NULL,
    recipient_phone     VARCHAR(20) NOT NULL,
    shipping_address    VARCHAR(255) NOT NULL,
    weight_kg           DECIMAL(6, 2) NOT NULL DEFAULT 0.5,
    fee                 DECIMAL(12, 2) NOT NULL,
    status              ENUM('pending', 'picked_up', 'in_transit', 'delivered', 'failed', 'returned')
                            NOT NULL DEFAULT 'pending',
    shipped_at          DATETIME NULL,
    delivered_at        DATETIME NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_shipments_user (user_id),
    INDEX idx_shipments_status (status),
    INDEX idx_shipments_carrier (carrier)
);

-- ---------------------------------------------------------------------
-- shipment_status_logs: lịch sử đổi trạng thái của từng vận đơn — phục vụ "tracking" (khách xem
-- hành trình giao hàng theo mốc thời gian), giống stock_logs của Warehouse Service hay cách Order
-- Service phát 'order.status_changed' kèm previousStatus để có dấu vết đầy đủ vòng đời.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shipment_status_logs (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    shipment_id     INT NOT NULL,
    status          ENUM('pending', 'picked_up', 'in_transit', 'delivered', 'failed', 'returned') NOT NULL,
    note            VARCHAR(255) NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_shipment_logs_shipment (shipment_id),
    CONSTRAINT fk_shipment_logs_shipment FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE
);
