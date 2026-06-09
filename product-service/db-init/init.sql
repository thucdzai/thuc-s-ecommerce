-- =====================================================================
-- PRODUCT CATALOG SERVICE — product_db
-- Trưng bày hàng hóa, chịu tải đọc lớn. Không chứa khóa ngoại trỏ sang service khác.
-- =====================================================================

-- Khai báo charset của kết nối là utf8mb4 TRƯỚC khi insert dữ liệu mẫu có dấu tiếng Việt.
-- Thiếu dòng này, docker-entrypoint-initdb.d nạp file bằng client charset mặc định (latin1),
-- khiến chuỗi UTF-8 bị diễn giải sai và lưu vào DB dưới dạng "double-encoded" (mojibake).
SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS product_db;
USE product_db;

-- ---------------------------------------------------------------------
-- categories: danh mục đa cấp (tự tham chiếu qua parent_id)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    parent_id  INT NULL,
    name       VARCHAR(100) NOT NULL,
    slug       VARCHAR(120) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_categories_parent (parent_id)
);

-- ---------------------------------------------------------------------
-- products: thông tin gốc của sản phẩm (SPU - Standard Product Unit)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    category_id   INT NOT NULL,
    name          VARCHAR(200) NOT NULL,
    slug          VARCHAR(220) NOT NULL UNIQUE,
    description   TEXT NULL,
    thumbnail_url VARCHAR(500) NULL,
    status        ENUM('draft', 'active', 'discontinued') NOT NULL DEFAULT 'draft',
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id),
    INDEX idx_products_category (category_id),
    INDEX idx_products_status (status)
);

-- ---------------------------------------------------------------------
-- product_images: 1 sản phẩm có nhiều ảnh, có thứ tự hiển thị
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_images (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    image_url  VARCHAR(500) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_product_images_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_product_images_product (product_id)
);

-- ---------------------------------------------------------------------
-- variants (SKU): các phiên bản cụ thể được bán ra thực tế
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS variants (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    product_id        INT NOT NULL,
    sku_code          VARCHAR(64) NOT NULL UNIQUE,
    name              VARCHAR(150) NULL,
    price             DECIMAL(12, 2) NOT NULL,
    compare_at_price  DECIMAL(12, 2) NULL,
    image_url         VARCHAR(500) NULL,
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_variants_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_variants_product (product_id)
);

-- ---------------------------------------------------------------------
-- variant_attributes: thuộc tính của biến thể theo mô hình EAV
-- (linh hoạt cho mọi ngành hàng — quần áo có size/màu, điện thoại có dung lượng/màu...)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS variant_attributes (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    variant_id       INT NOT NULL,
    attribute_name   VARCHAR(50) NOT NULL,
    attribute_value  VARCHAR(100) NOT NULL,
    CONSTRAINT fk_variant_attributes_variant FOREIGN KEY (variant_id) REFERENCES variants(id) ON DELETE CASCADE,
    INDEX idx_variant_attributes_variant (variant_id)
);

-- ---------------------------------------------------------------------
-- Seed dữ liệu mẫu để demo phân trang / lọc / chi tiết sản phẩm
-- ---------------------------------------------------------------------
INSERT INTO categories (id, parent_id, name, slug) VALUES
    (1, NULL, 'Thời trang nam', 'thoi-trang-nam'),
    (2, NULL, 'Thời trang nữ', 'thoi-trang-nu'),
    (3, 1, 'Áo thun nam', 'ao-thun-nam')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO products (id, category_id, name, slug, description, thumbnail_url, status) VALUES
    (1, 3, 'Áo thun cotton basic', 'ao-thun-cotton-basic',
        'Áo thun cotton 100%, form rộng thoải mái, phù hợp mặc hàng ngày.',
        'https://picsum.photos/seed/shirt-basic/400', 'active'),
    (2, 3, 'Áo thun in họa tiết Streetwear', 'ao-thun-in-hoa-tiet-streetwear',
        'Áo thun phong cách đường phố, chất liệu thoáng mát, form unisex.',
        'https://picsum.photos/seed/shirt-street/400', 'active')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO variants (id, product_id, sku_code, price, compare_at_price, image_url) VALUES
    (1, 1, 'AOTHUN-BASIC-S-TRANG', 199000, 249000, 'https://picsum.photos/seed/sku-1/400'),
    (2, 1, 'AOTHUN-BASIC-M-DEN',   199000, 249000, 'https://picsum.photos/seed/sku-2/400'),
    (3, 2, 'AOTHUN-STREET-L-XAM',  259000, NULL,    'https://picsum.photos/seed/sku-3/400')
ON DUPLICATE KEY UPDATE price = VALUES(price);

INSERT INTO variant_attributes (variant_id, attribute_name, attribute_value) VALUES
    (1, 'Kích thước', 'S'), (1, 'Màu sắc', 'Trắng'),
    (2, 'Kích thước', 'M'), (2, 'Màu sắc', 'Đen'),
    (3, 'Kích thước', 'L'), (3, 'Màu sắc', 'Xám')
ON DUPLICATE KEY UPDATE attribute_value = VALUES(attribute_value);
