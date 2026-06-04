-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'User',
  name TEXT,
  photo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create income table
CREATE TABLE IF NOT EXISTS income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  source TEXT NOT NULL,
  category TEXT,
  description TEXT,
  attachment TEXT,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  description TEXT,
  source TEXT NOT NULL,
  attachment TEXT,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'Pending',
  manager_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN DEFAULT FALSE,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create settings table (single row)
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  company_name TEXT NOT NULL DEFAULT 'Abirlink CommunicationBD Laser Book',
  logo TEXT,
  balances JSONB DEFAULT '{"cash": 0, "bkash": 0, "nagad": 0, "dbbl": 0}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial settings if not exists
INSERT INTO settings (id, company_name, balances)
VALUES (1, 'Abirlink CommunicationBD Laser Book', '{"cash": 0, "bkash": 0, "nagad": 0, "dbbl": 0}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Enable Row Level Security (RLS) - Optional but recommended
-- For now, we'll assume the service role key is used for backend operations.
