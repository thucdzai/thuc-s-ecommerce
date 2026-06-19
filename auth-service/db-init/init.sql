-- =====================================================================
-- AUTH SERVICE — auth_db
-- Quản lý danh tính, phân quyền, sổ địa chỉ và phiên đăng nhập.
-- Lưu ý: Không có khóa ngoại trỏ sang service khác (logical reference only).
-- =====================================================================

CREATE DATABASE IF NOT EXISTS auth_db;
USE auth_db;

-- ---------------------------------------------------------------------
-- users: thông tin định danh cốt lõi
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id                 INT AUTO_INCREMENT PRIMARY KEY,
    email              VARCHAR(150) NOT NULL UNIQUE,
    password_hash      VARCHAR(255) NOT NULL,
    full_name          VARCHAR(100) NOT NULL,
    phone              VARCHAR(20)  NULL,
    avatar_url         VARCHAR(500) NULL,
    status             ENUM('active', 'banned') NOT NULL DEFAULT 'active',
    email_verified_at  TIMESTAMP NULL DEFAULT NULL,
    created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- roles: định nghĩa các quyền trong hệ thống
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255) NULL
);

-- ---------------------------------------------------------------------
-- user_roles: bảng trung gian N-N giữa users và roles
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_roles (
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- addresses: sổ địa chỉ giao hàng của khách
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS addresses (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    user_id        INT NOT NULL,
    recipient_name VARCHAR(100) NOT NULL,
    phone          VARCHAR(20)  NOT NULL,
    province       VARCHAR(100) NOT NULL,
    district       VARCHAR(100) NOT NULL,
    ward           VARCHAR(100) NOT NULL,
    street_detail  VARCHAR(255) NOT NULL,
    is_default     TINYINT(1) NOT NULL DEFAULT 0,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_addresses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_addresses_user (user_id)
);

-- ---------------------------------------------------------------------
-- password_reset_tokens: token đặt lại mật khẩu (lưu hash, hết hạn sau 15 phút)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    token_hash  VARCHAR(255) NOT NULL UNIQUE,
    expires_at  TIMESTAMP NOT NULL,
    used_at     TIMESTAMP NULL DEFAULT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_prt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_prt_token (token_hash)
);

-- ---------------------------------------------------------------------
-- refresh_tokens: lưu phiên đăng nhập an toàn (lưu hash, không lưu token thô)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    token_hash  VARCHAR(255) NOT NULL,
    device_info VARCHAR(255) NULL,
    expires_at  TIMESTAMP NOT NULL,
    revoked_at  TIMESTAMP NULL DEFAULT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_refresh_tokens_user (user_id),
    INDEX idx_refresh_tokens_hash (token_hash)
);

-- ---------------------------------------------------------------------
-- Seed dữ liệu khởi tạo
-- ---------------------------------------------------------------------
INSERT INTO roles (name, description) VALUES
    ('ADMIN', 'Quản trị toàn hệ thống'),
    ('STAFF', 'Nhân viên xử lý vận hành'),
    ('USER',  'Khách hàng mua sắm')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Mật khẩu mặc định: Admin@123 (đã băm bằng bcrypt, cost factor 10)
INSERT INTO users (email, password_hash, full_name, status, email_verified_at)
VALUES ('admin@tttn.com', '$2a$10$6JG9HoJetujtk5aVHivtNumLxin3DaEr99jpyrERNaLO4gS3FxQZm', 'Quản trị viên', 'active', NOW())
ON DUPLICATE KEY UPDATE email = VALUES(email);

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.email = 'admin@tttn.com' AND r.name = 'ADMIN'
ON DUPLICATE KEY UPDATE user_id = VALUES(user_id);
