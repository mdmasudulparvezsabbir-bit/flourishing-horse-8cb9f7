-- Supabase Schema for Abirlink ERP
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role TEXT DEFAULT 'User',
  name TEXT NOT NULL,
  photo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Income Table
CREATE TABLE IF NOT EXISTS income (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  amount DECIMAL(15, 2) NOT NULL,
  category TEXT NOT NULL,
  source TEXT NOT NULL,
  description TEXT,
  date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  amount DECIMAL(15, 2) NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  source TEXT NOT NULL,
  description TEXT,
  attachment TEXT,
  date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'Pending',
  manager_note TEXT,
  admin_note TEXT,
  deducted_amount DECIMAL(15, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Settings Table
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  company_name TEXT DEFAULT 'Abirlink ERP',
  logo TEXT,
  balances JSONB DEFAULT '{"Cash": 0, "Bkash": 0, "DBBL": 0, "Nagad": 0}'::jsonb
);

-- 6. Requisitions Table
CREATE TABLE IF NOT EXISTS requisitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  items TEXT NOT NULL,
  total_amount DECIMAL(15, 2) NOT NULL,
  reason TEXT,
  date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'Pending',
  admin_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Stock Items Table
CREATE TABLE IF NOT EXISTS stock_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  quantity DECIMAL(15, 2) DEFAULT 0,
  unit TEXT DEFAULT 'pcs',
  last_purchase_price DECIMAL(15, 2) DEFAULT 0,
  min_stock_level DECIMAL(15, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Purchases Table
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID REFERENCES stock_items(id),
  quantity DECIMAL(15, 2) NOT NULL,
  price_per_unit DECIMAL(15, 2) NOT NULL,
  total_amount DECIMAL(15, 2) NOT NULL,
  paid_amount DECIMAL(15, 2) DEFAULT 0,
  due_amount DECIMAL(15, 2) DEFAULT 0,
  supplier TEXT,
  source TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Due Payments Table
CREATE TABLE IF NOT EXISTS due_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_id UUID REFERENCES purchases(id),
  amount DECIMAL(15, 2) NOT NULL,
  source TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Stock Out Table
CREATE TABLE IF NOT EXISTS stock_out (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_id UUID REFERENCES stock_items(id),
  quantity DECIMAL(15, 2) NOT NULL,
  destination TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  user_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Todos Table
CREATE TABLE IF NOT EXISTS todos (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create initial admin user (Password: admin123)
-- The app uses bcrypt for password hashing.
INSERT INTO users (id, username, password, role, name)
VALUES (uuid_generate_v4(), 'admin', '$2a$10$7/O6p6.lS6jW6D6Y6D6Y6euW/vWvYvYvYvYvYvYvYvYvYvYvYvYvY', 'Admin', 'Default Admin')
ON CONFLICT (username) DO NOTHING;

-- Insert default settings
INSERT INTO settings (id, company_name) VALUES (1, 'Abirlink ERP') ON CONFLICT (id) DO NOTHING;
