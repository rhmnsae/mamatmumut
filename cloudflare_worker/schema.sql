-- Cloudflare D1 Schema (SQLite)

DROP TABLE IF EXISTS users;
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    session_token TEXT NULL,
    last_login TEXT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

DROP TABLE IF EXISTS categories;
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);

DROP TABLE IF EXISTS products;
CREATE TABLE products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sku TEXT NULL,
    category TEXT NULL,
    original_price REAL DEFAULT 0,
    sale_price REAL NOT NULL DEFAULT 0,
    stock INTEGER DEFAULT 0,
    weight REAL NULL,
    dimension_l REAL NULL,
    dimension_w REAL NULL,
    dimension_h REAL NULL,
    image_url TEXT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Indices
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_session_token ON users(session_token);
CREATE INDEX idx_categories_name ON categories(name);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_category ON products(category);

-- Default Categories
INSERT INTO categories (name) VALUES
    ('Elektronik'),
    ('Fashion'),
    ('Makanan & Minuman'),
    ('Kesehatan'),
    ('Rumah Tangga'),
    ('Olahraga'),
    ('Hobi'),
    ('Lainnya');
