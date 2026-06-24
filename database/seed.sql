-- Seeding Initial Master Data for ReimHub

-- 1. Seed Roles
INSERT INTO roles (id, role_name) VALUES
(1, 'Karyawan'),
(2, 'Atasan'),
(3, 'Finance'),
(4, 'Treasury'),
(5, 'Admin')
ON CONFLICT (id) DO NOTHING;

-- 2. Seed Departments
INSERT INTO departments (id, department_name) VALUES
(1, 'Teknologi Informasi'),
(2, 'Pemasaran & Penjualan'),
(3, 'Sumber Daya Manusia'),
(4, 'Operasional'),
(5, 'Keuangan')
ON CONFLICT (id) DO NOTHING;

-- 3. Seed Categories
INSERT INTO categories (id, category_name, gl_code) VALUES
(1, 'Transportasi', '5001-TRANS'),
(2, 'Makan & Hiburan', '5002-MEAL'),
(3, 'Akomodasi', '5003-ACCOM'),
(4, 'Operasional Kantor', '5004-OFFICE'),
(5, 'Kesehatan & Medis', '5005-HEALTH')
ON CONFLICT (id) DO NOTHING;

-- 4. Seed Mock Users
-- Note: In a real system, passwords would be hashed. For the local simulation store, we seed simple credentials.
-- User Karyawan (Budi Santoso)
-- User Atasan (Agus Wijaya)
-- User Finance (Siti Aminah)
-- User Treasury (Dewi Lestari)
-- User Admin (Hendra Pratama)
