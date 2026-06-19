-- =====================================================================
-- CART SERVICE — cart_db
-- Quản lý giỏ hàng của người dùng. Giữ thêm "bản sao đọc" (snapshot) tên/giá sản phẩm,
-- đồng bộ qua sự kiện Kafka 'product-events', để tự tính tổng tiền mà không phải gọi
-- HTTP đồng bộ sang Product Service mỗi lần khách mở giỏ hàng.
-- Không có khóa ngoại trỏ sang Product Service (khác DB) — sku_id chỉ là tham chiếu lỏng.
-- =====================================================================

-- Khai báo charset của kết nối là utf8mb4 TRƯỚC khi insert dữ liệu mẫu có dấu tiếng Việt,
-- tránh lỗi double-encoding (mojibake) khi docker-entrypoint-initdb.d nạp file bằng client charset latin1.
SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS cart_db;
USE cart_db;

-- ---------------------------------------------------------------------
-- carts: mỗi người dùng có đúng 1 giỏ hàng, được tạo "lười" ở lần thao tác đầu tiên.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS carts (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL UNIQUE,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- cart_items: từng dòng sản phẩm (theo SKU) trong giỏ hàng — UNIQUE(cart_id, sku_id)
-- đảm bảo 1 SKU chỉ xuất hiện đúng 1 dòng, thêm lần nữa thì cộng dồn số lượng (xử lý ở Service).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cart_items (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    cart_id     INT NOT NULL,
    sku_id      INT NOT NULL,
    quantity    INT NOT NULL DEFAULT 1,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_cart_items_cart_sku (cart_id, sku_id),
    INDEX idx_cart_items_sku (sku_id),
    CONSTRAINT fk_cart_items_cart FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- product_snapshots: "bản sao đọc" tên/giá sản phẩm, được đồng bộ liên tục qua Kafka
-- (consumer subscribe 'product-events' với fromBeginning: true nên tự lấp đầy khi mới khởi động).
-- Cart Service KHÔNG được phép coi đây là nguồn dữ liệu gốc — chỉ dùng để hiển thị & tính tạm,
-- giá/khuyến mãi chính thức luôn được Order Service xác nhận lại với Product Service lúc checkout.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_snapshots (
    sku_id              INT PRIMARY KEY,
    sku_code            VARCHAR(64) NOT NULL,
    product_id          INT NOT NULL,
    product_name        VARCHAR(255) NOT NULL,
    product_slug        VARCHAR(255) NOT NULL,
    price               DECIMAL(12, 2) NOT NULL,
    compare_at_price    DECIMAL(12, 2) NULL,
    status              ENUM('draft', 'active', 'discontinued') NOT NULL DEFAULT 'active',
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_product_snapshots_product (product_id),
    INDEX idx_product_snapshots_status (status)
);
