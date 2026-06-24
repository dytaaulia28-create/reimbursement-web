-- ============================================================
-- ReimHub Supabase Migration Script
-- Run this AFTER schema.sql to adjust types and seed all data
-- ============================================================

-- Drop existing tables (cascade) to recreate with correct types
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS archives CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS ledger_entries CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS verification_logs CASCADE;
DROP TABLE IF EXISTS approval_logs CASCADE;
DROP TABLE IF EXISTS reimbursement_receipts CASCADE;
DROP TABLE IF EXISTS reimbursements CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS departments CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS bank_accounts CASCADE;

-- =====================
-- 1. ROLES
-- =====================
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE
);

-- =====================
-- 2. DEPARTMENTS
-- =====================
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL UNIQUE
);

-- =====================
-- 3. USERS (TEXT ID for custom IDs like K0001, A0001)
-- =====================
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password TEXT,
    role_id INT NOT NULL REFERENCES roles(id),
    department_id INT REFERENCES departments(id),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================
-- 4. CATEGORIES
-- =====================
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    gl_code VARCHAR(20) NOT NULL UNIQUE
);

-- =====================
-- 5. BANK ACCOUNTS
-- =====================
CREATE TABLE bank_accounts (
    id SERIAL PRIMARY KEY,
    bank VARCHAR(100) NOT NULL,
    account_no VARCHAR(50) NOT NULL,
    name VARCHAR(150) NOT NULL,
    balance DECIMAL(18, 2) NOT NULL DEFAULT 0
);

-- =====================
-- 6. REIMBURSEMENTS
-- =====================
CREATE TABLE reimbursements (
    id TEXT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    employee_id TEXT NOT NULL REFERENCES users(id),
    category_id INT NOT NULL REFERENCES categories(id),
    description TEXT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    transaction_date DATE NOT NULL,
    status VARCHAR(30) DEFAULT 'draft' CHECK (status IN (
        'draft', 'pending_manager', 'rejected_manager',
        'pending_finance', 'rejected_finance',
        'pending_payment', 'paid', 'archived'
    )),
    current_stage VARCHAR(30) DEFAULT 'submission',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================
-- 7. REIMBURSEMENT RECEIPTS
-- =====================
CREATE TABLE reimbursement_receipts (
    id TEXT PRIMARY KEY,
    reimbursement_id TEXT NOT NULL REFERENCES reimbursements(id) ON DELETE CASCADE,
    receipt_path TEXT NOT NULL,
    checksum VARCHAR(64),
    mime_type VARCHAR(100),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================
-- 8. APPROVAL LOGS
-- =====================
CREATE TABLE approval_logs (
    id TEXT PRIMARY KEY,
    reimbursement_id TEXT NOT NULL REFERENCES reimbursements(id) ON DELETE CASCADE,
    actor_id TEXT NOT NULL REFERENCES users(id),
    stage VARCHAR(50) NOT NULL,
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('approved', 'rejected')),
    notes TEXT,
    acted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================
-- 9. VERIFICATION LOGS
-- =====================
CREATE TABLE verification_logs (
    id TEXT PRIMARY KEY,
    reimbursement_id TEXT NOT NULL REFERENCES reimbursements(id) ON DELETE CASCADE,
    actor_id TEXT NOT NULL REFERENCES users(id),
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('verified', 'rejected')),
    notes TEXT,
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================
-- 10. PAYMENTS
-- =====================
CREATE TABLE payments (
    id TEXT PRIMARY KEY,
    reimbursement_id TEXT NOT NULL REFERENCES reimbursements(id) ON DELETE CASCADE,
    treasury_id TEXT NOT NULL REFERENCES users(id),
    method VARCHAR(50) NOT NULL DEFAULT 'Bank Transfer',
    bank_name VARCHAR(100) NOT NULL,
    reference_no VARCHAR(100) NOT NULL,
    proof_path TEXT,
    paid_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================
-- 11. LEDGER ENTRIES
-- =====================
CREATE TABLE ledger_entries (
    id TEXT PRIMARY KEY,
    reimbursement_id TEXT NOT NULL REFERENCES reimbursements(id) ON DELETE CASCADE,
    account_code VARCHAR(20) NOT NULL,
    debit DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    credit DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    entry_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    memo TEXT
);

-- =====================
-- 12. DOCUMENTS
-- =====================
CREATE TABLE documents (
    id TEXT PRIMARY KEY,
    reimbursement_id TEXT NOT NULL REFERENCES reimbursements(id) ON DELETE CASCADE,
    doc_type VARCHAR(50) NOT NULL DEFAULT 'reimbursement_summary',
    file_path TEXT NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================
-- 13. ARCHIVES
-- =====================
CREATE TABLE archives (
    id TEXT PRIMARY KEY,
    reimbursement_id TEXT NOT NULL REFERENCES reimbursements(id) ON DELETE CASCADE,
    archive_path TEXT NOT NULL,
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    archived_by TEXT REFERENCES users(id)
);

-- =====================
-- 14. NOTIFICATIONS
-- =====================
CREATE TABLE notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    title VARCHAR(150) NOT NULL,
    body TEXT NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================
-- 15. AUDIT LOGS
-- =====================
CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY,
    actor_id TEXT REFERENCES users(id),
    actor_name VARCHAR(100),
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    entity_id TEXT,
    detail TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Roles
INSERT INTO roles (id, role_name) VALUES
(1, 'Karyawan'),
(2, 'Atasan'),
(3, 'Finance'),
(4, 'Treasury'),
(5, 'Admin')
ON CONFLICT (id) DO NOTHING;

-- Departments
INSERT INTO departments (id, department_name) VALUES
(1, 'Teknologi Informasi'),
(2, 'Pemasaran & Penjualan'),
(3, 'Sumber Daya Manusia'),
(4, 'Operasional'),
(5, 'Keuangan')
ON CONFLICT (id) DO NOTHING;

-- Categories
INSERT INTO categories (id, category_name, gl_code) VALUES
(1, 'Transportasi', '5001-TRANS'),
(2, 'Makan & Hiburan', '5002-MEAL'),
(3, 'Akomodasi', '5003-ACCOM'),
(4, 'Operasional Kantor', '5004-OFFICE'),
(5, 'Kesehatan & Medis', '5005-HEALTH')
ON CONFLICT (id) DO NOTHING;

-- Users (password = user ID for demo)
INSERT INTO users (id, full_name, email, password, role_id, department_id, status) VALUES
('K0001', 'Dudul',   'dudul@reimhub.com',  'K0001', 1, 1, 'active'),
('A0001', 'Sumbul',  'sumbul@reimhub.com', 'A0001', 2, 1, 'active'),
('F0001', 'Joy',     'joy@reimhub.com',    'F0001', 3, 5, 'active'),
('T0001', 'Tut',     'tut@reimhub.com',    'T0001', 4, 5, 'active'),
('M0001', 'Mimi',    'mimi@reimhub.com',   'M0001', 5, 1, 'active')
ON CONFLICT (id) DO NOTHING;

-- Bank Accounts
INSERT INTO bank_accounts (id, bank, account_no, name, balance) VALUES
(1, 'Bank Central Asia (BCA)', '230-99120-19', 'PT HONOUR LANE SHIPPING', 100000000)
ON CONFLICT (id) DO NOTHING;

-- Initial Audit Log
INSERT INTO audit_logs (id, action, entity, ip_address, actor_name) VALUES
('log-0', 'SEED_DATABASE', 'system', '127.0.0.1', 'System Automator');

-- ============================================================
-- DISABLE RLS for simplicity (anon key can access all tables)
-- In production, enable RLS with proper policies!
-- ============================================================
ALTER TABLE roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE reimbursements DISABLE ROW LEVEL SECURITY;
ALTER TABLE reimbursement_receipts DISABLE ROW LEVEL SECURITY;
ALTER TABLE approval_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE verification_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE archives DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
