-- Create Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL,
  name TEXT,
  photo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Settings table
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY,
  company_name TEXT,
  logo TEXT,
  balances JSONB DEFAULT '{"Cash": 0, "Bkash": 0, "DBBL": 0, "Nagad": 0}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Income table
CREATE TABLE IF NOT EXISTS income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  category TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  source TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  note TEXT,
  attachment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  category TEXT NOT NULL,
  subcategory TEXT,
  amount DECIMAL(12, 2) NOT NULL,
  source TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  note TEXT,
  attachment TEXT,
  status TEXT DEFAULT 'Pending',
  manager_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  read BOOLEAN DEFAULT FALSE
);

-- Chat Tables
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS room_members (
  room_id UUID REFERENCES rooms(id),
  user_id UUID REFERENCES users(id),
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id),
  user_id UUID REFERENCES users(id) NOT NULL,
  body TEXT NOT NULL,
  inserted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
