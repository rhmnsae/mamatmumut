-- =====================================================
-- LATRANSHOP DATABASE SCHEMA
-- MySQL Database untuk Latranshop Product Manager
-- =====================================================

-- Buat database (jika belum ada)
-- CREATE DATABASE IF NOT EXISTS latranshop CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE latranshop;

-- =====================================================
-- TABEL: users
-- Menyimpan data user dan authentication
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    session_token VARCHAR(64) NULL,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_username (username),
    INDEX idx_session_token (session_token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABEL: categories
-- Menyimpan daftar kategori produk
-- =====================================================
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- TABEL: products
-- Menyimpan data produk
-- =====================================================
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(50) NULL,
    category VARCHAR(100) NULL,
    original_price DECIMAL(15,2) DEFAULT 0,
    sale_price DECIMAL(15,2) NOT NULL DEFAULT 0,
    stock INT DEFAULT 0,
    weight DECIMAL(10,2) NULL,
    dimension_l DECIMAL(10,2) NULL,
    dimension_w DECIMAL(10,2) NULL,
    dimension_h DECIMAL(10,2) NULL,
    image_url TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_name (name),
    INDEX idx_sku (sku),
    INDEX idx_category (category),
    INDEX idx_stock (stock),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- INSERT: Default categories
-- =====================================================
INSERT IGNORE INTO categories (name) VALUES
    ('Elektronik'),
    ('Fashion'),
    ('Makanan & Minuman'),
    ('Kesehatan'),
    ('Rumah Tangga'),
    ('Olahraga'),
    ('Hobi'),
    ('Lainnya');

-- =====================================================
-- INSERT: Default admin user
-- Password: otongsurotong99!
-- HASH dibuat dengan PHP password_hash()
-- =====================================================
-- CATATAN: Jangan insert admin disini, gunakan endpoint /api/auth.php?action=init

-- =====================================================
-- SELESAI
-- =====================================================
-- Setelah import file ini ke phpMyAdmin:
-- 1. Buka browser dan akses: yoursite.com/api/auth.php?action=init
-- 2. Ini akan membuat admin default dengan password: otongsurotong99!
