-- Database Schema for ReimHub (PostgreSQL & Supabase RLS)

-- 1. ROLES TABLE
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE
);

-- 2. DEPARTMENTS TABLE
CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL UNIQUE
);

-- 3. USERS TABLE
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT NOT NULL REFERENCES roles(id),
    department_id INT REFERENCES departments(id),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. CATEGORIES TABLE
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    gl_code VARCHAR(20) NOT NULL UNIQUE
);

-- 5. REIMBURSEMENTS TABLE
CREATE TABLE reimbursements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE, -- E.g. REIM-2026-0001
    employee_id UUID NOT NULL REFERENCES users(id),
    category_id INT NOT NULL REFERENCES categories(id),
    description TEXT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    transaction_date DATE NOT NULL,
    status VARCHAR(30) DEFAULT 'draft' CHECK (status IN (
        'draft',
        'pending_manager',
        'rejected_manager',
        'pending_finance',
        'rejected_finance',
        'pending_payment',
        'paid',
        'archived'
    )),
    current_stage VARCHAR(30) DEFAULT 'submission', -- submission, manager, finance, treasury, archived
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. REIMBURSEMENT RECEIPTS TABLE
CREATE TABLE reimbursement_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reimbursement_id UUID NOT NULL REFERENCES reimbursements(id) ON DELETE CASCADE,
    receipt_path TEXT NOT NULL, -- Storage URL or key
    checksum VARCHAR(64),
    mime_type VARCHAR(100),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. APPROVAL LOGS TABLE
CREATE TABLE approval_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reimbursement_id UUID NOT NULL REFERENCES reimbursements(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES users(id),
    stage VARCHAR(50) NOT NULL,
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('approved', 'rejected')),
    notes TEXT,
    acted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. VERIFICATION LOGS TABLE
CREATE TABLE verification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reimbursement_id UUID NOT NULL REFERENCES reimbursements(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES users(id),
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('verified', 'rejected')),
    notes TEXT,
    verified_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. PAYMENTS TABLE
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reimbursement_id UUID NOT NULL REFERENCES reimbursements(id) ON DELETE CASCADE,
    treasury_id UUID NOT NULL REFERENCES users(id),
    method VARCHAR(50) NOT NULL DEFAULT 'Bank Transfer',
    bank_name VARCHAR(100) NOT NULL,
    reference_no VARCHAR(100) NOT NULL UNIQUE,
    proof_path TEXT, -- Link to proof of transfer image
    paid_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. GENERAL LEDGER ENTRIES TABLE
CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reimbursement_id UUID NOT NULL REFERENCES reimbursements(id) ON DELETE CASCADE,
    account_code VARCHAR(20) NOT NULL, -- GL Code from category or Cash/Bank code
    debit DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    credit DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
    entry_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    memo TEXT
);

-- 11. DOCUMENTS TABLE (Generated electronic documents metadata)
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reimbursement_id UUID NOT NULL REFERENCES reimbursements(id) ON DELETE CASCADE,
    doc_type VARCHAR(50) NOT NULL DEFAULT 'reimbursement_summary',
    file_path TEXT NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. ARCHIVES TABLE (System archive metadata)
CREATE TABLE archives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reimbursement_id UUID NOT NULL REFERENCES reimbursements(id) ON DELETE CASCADE,
    archive_path TEXT NOT NULL,
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    archived_by UUID REFERENCES users(id)
);

-- 13. NOTIFICATIONS TABLE
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(150) NOT NULL,
    body TEXT NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. AUDIT LOGS TABLE
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES users(id),
    actor_name VARCHAR(100),
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    entity_id UUID,
    detail TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ROW LEVEL SECURITY (RLS) POLICIES FOR SUPABASE
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reimbursements ENABLE ROW LEVEL SECURITY;
ALTER TABLE reimbursement_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE archives ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Sample Policy: Employees can only view their own reimbursements
CREATE POLICY select_own_reimbursement ON reimbursements
    FOR SELECT TO authenticated
    USING (employee_id = auth.uid());

-- Sample Policy: Managers can view reimbursements pending their approval
CREATE POLICY select_manager_approval ON reimbursements
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid() AND users.role_id = 2 -- Role Atasan
        )
    );

-- Sample Policy: Finance can view all reimbursements
CREATE POLICY select_finance_all ON reimbursements
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid() AND users.role_id = 3 -- Role Finance
        )
    );
