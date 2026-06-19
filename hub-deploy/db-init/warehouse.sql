-- =====================================================================
-- WAREHOUSE SERVICE — warehouse_db
-- Quản lý tồn kho thực tế / khả dụng, giữ chỗ khi đặt hàng, lịch sử xuất nhập.
-- Không có khóa ngoại trỏ sang Product Service (khác DB) — sku_id chỉ là tham chiếu lỏng,
-- được đồng bộ qua sự kiện Kafka 'product-events'.
-- =====================================================================

-- Khai báo charset của kết nối là utf8mb4 TRƯỚC khi insert dữ liệu mẫu có dấu tiếng Việt,
-- tránh lỗi double-encoding (mojibake) khi docker-entrypoint-initdb.d nạp file bằng client charset latin1.
SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS warehouse_db;
USE warehouse_db;

-- ---------------------------------------------------------------------
-- inventory: mỗi SKU có đúng 1 dòng, tách riêng tồn thực tế và tồn khả dụng
-- (khả dụng = thực tế - đang bị giữ chỗ bởi các đơn chưa thanh toán)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    sku_id              INT NOT NULL UNIQUE,
    sku_code            VARCHAR(64) NOT NULL,
    product_id          INT NOT NULL,
    quantity_on_hand    INT NOT NULL DEFAULT 0,
    quantity_available  INT NOT NULL DEFAULT 0,
    status              ENUM('active', 'discontinued') NOT NULL DEFAULT 'active',
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_inventory_sku_code (sku_code),
    INDEX idx_inventory_status (status)
);

-- ---------------------------------------------------------------------
-- stock_locks: mỗi lượt "giữ chỗ" khi khách đặt hàng — có hạn (expires_at),
-- hết hạn mà đơn chưa thanh toán thì hệ thống tự nhả lại quantity_available.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_locks (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    sku_id      INT NOT NULL,
    order_id    VARCHAR(64) NOT NULL,
    quantity    INT NOT NULL,
    status      ENUM('holding', 'released', 'consumed', 'expired') NOT NULL DEFAULT 'holding',
    expires_at  TIMESTAMP NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_stock_locks_sku (sku_id),
    INDEX idx_stock_locks_order (order_id),
    INDEX idx_stock_locks_status_expires (status, expires_at)
);

-- ---------------------------------------------------------------------
-- stock_logs: sổ cái ghi lại MỌI biến động kho (giữ chỗ, nhả chỗ, trừ kho, nhập/điều chỉnh)
-- để truy vết và phục vụ báo cáo — BE tự gom nhóm/lọc/phân trang trước khi trả về FE.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_logs (
    id                          INT AUTO_INCREMENT PRIMARY KEY,
    sku_id                      INT NOT NULL,
    change_type                 ENUM('lock', 'release', 'deduct', 'import', 'adjustment') NOT NULL,
    quantity_change             INT NOT NULL,
    quantity_on_hand_after      INT NOT NULL,
    quantity_available_after    INT NOT NULL,
    reference_id                VARCHAR(64) NULL,
    note                        VARCHAR(255) NULL,
    created_at                  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_stock_logs_sku (sku_id),
    INDEX idx_stock_logs_change_type (change_type),
    INDEX idx_stock_logs_created (created_at)
);

-- ---------------------------------------------------------------------
-- Seed dữ liệu mẫu — khớp với 3 SKU đã seed sẵn ở Product Service (product_db)
-- để demo luồng kiểm tra/giữ chỗ/trừ kho ngay khi mới dựng service.
-- ---------------------------------------------------------------------
INSERT INTO inventory (sku_id, sku_code, product_id, quantity_on_hand, quantity_available, status) VALUES
    (1, 'AOTHUN-BASIC-S-TRANG', 1, 100, 100, 'active'),
    (2, 'AOTHUN-BASIC-M-DEN',   1, 80,  80,  'active'),
    (3, 'AOTHUN-STREET-L-XAM',  2, 50,  50,  'active')
ON DUPLICATE KEY UPDATE sku_code = VALUES(sku_code);
