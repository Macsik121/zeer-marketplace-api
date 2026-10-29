-- ============================================
-- Database Schema for Zeer Marketplace
-- PostgreSQL version
-- ============================================

-- DOMAINS
CREATE DOMAIN status_domain AS VARCHAR(20)
    CHECK (VALUE ~ 'active|freezed|expired|undetect');

CREATE DOMAIN user_role_domain AS VARCHAR(20)
    CHECK (VALUE IN ('admin', 'simple', 'banned'));

CREATE DOMAIN subscription_status_domain AS VARCHAR(20)
    CHECK (VALUE IN ('active', 'freezed', 'expired'));

-- ============================================
-- PRODUCTS MODULE
-- ============================================

-- Main products table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL UNIQUE,
    product_for VARCHAR(255),
    description TEXT,
    image_dashboard VARCHAR(500),
    image_logo VARCHAR(500),
    bought_times INT DEFAULT 0,
    location_onclick VARCHAR(500),
    status status_domain DEFAULT 'undetect'
);

-- Product general info (1-to-1)
CREATE TABLE IF NOT EXISTS products_general_info (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    working_time VARCHAR(100),
    bans_count INT DEFAULT 0,
    update_frequency VARCHAR(100),
    cost_per_day NUMERIC(10, 2)
);

-- Product homepage info (1-to-1)
CREATE TABLE IF NOT EXISTS products_homepage_info (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    image_homepage VARCHAR(500),
    cost_from NUMERIC(10, 2)
);

-- Product characteristics (1-to-1)
CREATE TABLE IF NOT EXISTS products_characteristics (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    version VARCHAR(50),
    os_support VARCHAR(255),
    cpu_support VARCHAR(255),
    game_mode VARCHAR(100),
    developer VARCHAR(100),
    supported_anti_cheats TEXT
);

-- Product costs/prices (1-to-many)
CREATE TABLE IF NOT EXISTS products_costs (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    cost NUMERIC(10, 2) NOT NULL,
    cost_per_period NUMERIC(10, 2),
    menu_text VARCHAR(100),
    days INT NOT NULL
);

-- Product changes/changelog (1-to-many)
CREATE TABLE IF NOT EXISTS products_changes (
    change_id SERIAL PRIMARY KEY,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    version VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    description TEXT
);

-- Product keys (1-to-many)
CREATE TABLE IF NOT EXISTS products_keys (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    key VARCHAR(255) NOT NULL,
    days_to_add INT NOT NULL,
    activations_amount INT DEFAULT 1,
    used_amount INT DEFAULT 0,
    is_used BOOLEAN DEFAULT false
);

-- Product promocodes (1-to-many)
CREATE TABLE IF NOT EXISTS products_promocodes (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    promocode VARCHAR(100) NOT NULL,
    discount_percent NUMERIC(5, 2) DEFAULT 0,
    used_amount INT DEFAULT 0,
    activations_amount INT DEFAULT 1,
    expired_at TIMESTAMP,
    is_used BOOLEAN DEFAULT false
);

-- People who bought product (many-to-many)
CREATE TABLE IF NOT EXISTS products_people_bought (
    id SERIAL PRIMARY KEY,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    bought_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(product_id, user_id)
);

-- ============================================
-- USERS MODULE
-- ============================================

-- Main users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    avatar VARCHAR(50),
    registered_at TIMESTAMP DEFAULT NOW(),
    hwid VARCHAR(500),
    role user_role_domain DEFAULT 'simple'
);

-- Reset binding requests (HWID reset)
CREATE TABLE IF NOT EXISTS reset_binding_requests (
    id SERIAL PRIMARY KEY,
    num INT NOT NULL,
    reason TEXT,
    requested_at TIMESTAMP DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'waiting',
    owner_id INT REFERENCES users(id) ON DELETE CASCADE,
    ip VARCHAR(50),
    location VARCHAR(255)
);

-- ============================================
-- BILLING MODULE
-- ============================================

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscription (
    subscription_id SERIAL PRIMARY KEY,
    product_id INT REFERENCES products(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    status subscription_status_domain DEFAULT 'active',
    freezed_at TIMESTAMP,
    active_until TIMESTAMP NOT NULL,
    was_freezed BOOLEAN DEFAULT false,
    UNIQUE(product_id, user_id)
);

-- Users used keys
CREATE TABLE IF NOT EXISTS users_used_keys (
    id SERIAL PRIMARY KEY,
    key_id INT REFERENCES products_keys(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    activated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(key_id, user_id)
);

-- Users used promocodes
CREATE TABLE IF NOT EXISTS users_used_promocodes (
    id SERIAL PRIMARY KEY,
    promo_id INT REFERENCES products_promocodes(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(promo_id, user_id)
);

-- Purchases
CREATE TABLE IF NOT EXISTS purchases (
    id SERIAL PRIMARY KEY,
    purchase_id INT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Profit tracking
CREATE TABLE IF NOT EXISTS profit (
    id SERIAL PRIMARY KEY,
    amount NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Payment number counter
CREATE TABLE IF NOT EXISTS payment_number (
    id INT PRIMARY KEY DEFAULT 1,
    num INT DEFAULT 1
);

INSERT INTO payment_number (id, num) VALUES (1, 1)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SUPPORT MODULE (FAQ)
-- ============================================

-- FAQ categories
CREATE TABLE IF NOT EXISTS faqs (
    id SERIAL PRIMARY KEY,
    faq_title VARCHAR(255) NOT NULL
);

-- FAQ answers
CREATE TABLE IF NOT EXISTS faq_answers (
    id SERIAL PRIMARY KEY,
    faq_id INT REFERENCES faqs(id) ON DELETE CASCADE,
    answer_text TEXT NOT NULL,
    usefulness_rate INT DEFAULT 0,
    rates_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TELEMETRY MODULE (LOGS)
-- ============================================

-- Action logs
CREATE TABLE IF NOT EXISTS action_logs (
    id SERIAL PRIMARY KEY,
    happened_at TIMESTAMP DEFAULT NOW(),
    user_name VARCHAR(100),
    action TEXT,
    ip VARCHAR(50),
    location VARCHAR(255)
);

-- Inject logs
CREATE TABLE IF NOT EXISTS inject_logs (
    id SERIAL PRIMARY KEY,
    happened_at TIMESTAMP DEFAULT NOW(),
    user_name VARCHAR(100),
    steam_id VARCHAR(100),
    IP VARCHAR(50)
);

-- Crash logs
CREATE TABLE IF NOT EXISTS crash_logs (
    id SERIAL PRIMARY KEY,
    happened_at TIMESTAMP DEFAULT NOW(),
    user_name VARCHAR(100),
    error_code INT,
    error_description TEXT,
    time_played INT,
    action TEXT
);

-- ============================================
-- SYSTEM TABLES
-- ============================================

-- Loader version
CREATE TABLE IF NOT EXISTS loader_version (
    id INT PRIMARY KEY DEFAULT 1,
    version VARCHAR(50) DEFAULT '1.0.0'
);

INSERT INTO loader_version (id, version) VALUES (1, '1.0.0')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Subscriptions
CREATE INDEX IF NOT EXISTS idx_sub_user_id ON subscription(user_id);
CREATE INDEX IF NOT EXISTS idx_sub_product_id ON subscription(product_id);
CREATE INDEX IF NOT EXISTS idx_sub_status ON subscription(status);

-- Reset binding requests
CREATE INDEX IF NOT EXISTS idx_reset_owner_id ON reset_binding_requests(owner_id);

-- Products
CREATE INDEX IF NOT EXISTS idx_promo_product_id ON products_promocodes(product_id);
CREATE INDEX IF NOT EXISTS idx_keys_product_id ON products_keys(product_id);
CREATE INDEX IF NOT EXISTS idx_costs_product_id ON products_costs(product_id);

-- Logs
CREATE INDEX IF NOT EXISTS idx_action_logs_user ON action_logs(user_name);
CREATE INDEX IF NOT EXISTS idx_inject_logs_user ON inject_logs(user_name);
CREATE INDEX IF NOT EXISTS idx_crash_logs_user ON crash_logs(user_name);

-- FAQ
CREATE INDEX IF NOT EXISTS idx_faq_answers_faq_id ON faq_answers(faq_id);

-- ============================================
-- INITIAL DATA (Products)
-- ============================================

-- Insert sample products
INSERT INTO products (title, product_for, description, image_dashboard, image_logo, bought_times, location_onclick, status) VALUES
('Aim Assist Pro', 'CS2', 'Professional aim assist tool', '/images/aim-assist.png', '/logo/aim-assist-logo.png', 0, '/dashboard/products/Aim Assist Pro', 'active'),
('Radar Hack', 'CS2', 'Advanced radar visibility', '/images/radar.png', '/logo/radar-logo.png', 0, '/dashboard/products/Radar Hack', 'active'),
('Skin Changer', 'CS2', 'Custom skins for weapons', '/images/skins.png', '/logo/skins-logo.png', 0, '/dashboard/products/Skin Changer', 'active');

-- Insert product general info
INSERT INTO products_general_info (product_id, working_time, bans_count, update_frequency, cost_per_day)
SELECT id, '24/7', 0, 'Daily', 100.00 FROM products WHERE title = 'Aim Assist Pro';

INSERT INTO products_general_info (product_id, working_time, bans_count, update_frequency, cost_per_day)
SELECT id, '24/7', 0, 'Weekly', 80.00 FROM products WHERE title = 'Radar Hack';

INSERT INTO products_general_info (product_id, working_time, bans_count, update_frequency, cost_per_day)
SELECT id, '24/7', 0, 'Monthly', 50.00 FROM products WHERE title = 'Skin Changer';

-- Insert product homepage info
INSERT INTO products_homepage_info (product_id, image_homepage, cost_from)
SELECT id, '/images/homepage/aim-assist.jpg', 100.00 FROM products WHERE title = 'Aim Assist Pro';

INSERT INTO products_homepage_info (product_id, image_homepage, cost_from)
SELECT id, '/images/homepage/radar.jpg', 80.00 FROM products WHERE title = 'Radar Hack';

INSERT INTO products_homepage_info (product_id, image_homepage, cost_from)
SELECT id, '/images/homepage/skins.jpg', 50.00 FROM products WHERE title = 'Skin Changer';

-- Insert product characteristics
INSERT INTO products_characteristics (product_id, version, os_support, cpu_support, game_mode, developer, supported_anti_cheats)
SELECT id, '2.0', 'Windows 10/11', 'Intel/AMD', 'Fullscreen', 'Zeer Team', 'VAC, FaceIt' FROM products WHERE title = 'Aim Assist Pro';

INSERT INTO products_characteristics (product_id, version, os_support, cpu_support, game_mode, developer, supported_anti_cheats)
SELECT id, '1.5', 'Windows 10/11', 'Intel/AMD', 'Windowed', 'Zeer Team', 'VAC' FROM products WHERE title = 'Radar Hack';

INSERT INTO products_characteristics (product_id, version, os_support, cpu_support, game_mode, developer, supported_anti_cheats)
SELECT id, '3.0', 'Windows 10/11', 'Intel/AMD', 'Any', 'Zeer Team', 'VAC, EAC' FROM products WHERE title = 'Skin Changer';

-- Insert product costs
INSERT INTO products_costs (product_id, cost, cost_per_period, menu_text, days)
SELECT id, 100.00, 100.00, '1 Day', 1 FROM products WHERE title = 'Aim Assist Pro';

INSERT INTO products_costs (product_id, cost, cost_per_period, menu_text, days)
SELECT id, 2500.00, 2500.00, '1 Month', 30 FROM products WHERE title = 'Aim Assist Pro';

INSERT INTO products_costs (product_id, cost, cost_per_period, menu_text, days)
SELECT id, 27000.00, 27000.00, '1 Year', 365 FROM products WHERE title = 'Aim Assist Pro';

INSERT INTO products_costs (product_id, cost, cost_per_period, menu_text, days)
SELECT id, 80.00, 80.00, '1 Day', 1 FROM products WHERE title = 'Radar Hack';

INSERT INTO products_costs (product_id, cost, cost_per_period, menu_text, days)
SELECT id, 2000.00, 2000.00, '1 Month', 30 FROM products WHERE title = 'Radar Hack';

INSERT INTO products_costs (product_id, cost, cost_per_period, menu_text, days)
SELECT id, 50.00, 50.00, '1 Day', 1 FROM products WHERE title = 'Skin Changer';

INSERT INTO products_costs (product_id, cost, cost_per_period, menu_text, days)
SELECT id, 1200.00, 1200.00, '1 Month', 30 FROM products WHERE title = 'Skin Changer';

-- ============================================
-- ADMIN USER (default password: admin123)
-- ============================================

INSERT INTO users (name, email, password, avatar, registered_at, hwid, role) VALUES
('admin', 'admin@zeer.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4wqO.4aYbYBMYyAe', '#1E75FF', NOW(), '', 'admin');

-- ============================================
-- SAMPLE FAQ
-- ============================================

INSERT INTO faqs (faq_title) VALUES
('How to use the loader?'),
('Payment methods'),
('Refund policy');

INSERT INTO faq_answers (faq_id, answer_text, usefulness_rate, rates_count) VALUES
((SELECT id FROM faqs WHERE faq_title = 'How to use the loader?'), 'Download the loader, run as administrator, enter your key.', 10, 15),
((SELECT id FROM faqs WHERE faq_title = 'Payment methods'), 'We accept cards, crypto, and skins.', 8, 12),
((SELECT id FROM faqs WHERE faq_title = 'Refund policy'), 'Refunds available within 24 hours after purchase.', 5, 8);
