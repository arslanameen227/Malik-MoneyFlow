-- Complete Database Schema for Malik MoneyFlow
-- Money Trade Shop Management System
-- Run this after executing reset_database.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE account_type AS ENUM ('cash', 'bank', 'wallet');
CREATE TYPE transaction_type AS ENUM (
  'cash_in',
  'cash_out',
  'cash_in_physical',
  'cash_out_physical',
  'cash_in_personal',
  'cash_out_personal',
  'account_transfer',
  'loan_given',
  'loan_received',
  'expense',
  'income'
);
CREATE TYPE fee_type AS ENUM ('percentage', 'fixed');
CREATE TYPE user_role AS ENUM ('admin', 'user');

-- User profiles table (for additional user info)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  role user_role DEFAULT 'user',
  business_name TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Accounts table
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type account_type NOT NULL,
  opening_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  current_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  account_number TEXT,
  provider TEXT,
  bank_name TEXT,
  branch_name TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers table
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  cnic TEXT,
  fee_type fee_type DEFAULT 'fixed',
  fee_value DECIMAL(10, 2) DEFAULT 0,
  credit_limit DECIMAL(15, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer accounts table (bank/wallet details for each customer)
CREATE TABLE customer_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  account_title TEXT NOT NULL,
  account_number TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  branch_name TEXT,
  type account_type NOT NULL DEFAULT 'bank',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type transaction_type NOT NULL,
  subcategory VARCHAR(20) CHECK (subcategory IN ('physical', 'digital')),
  from_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  to_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_account_id UUID REFERENCES customer_accounts(id) ON DELETE SET NULL,
  amount DECIMAL(15, 2) NOT NULL,
  fee_amount DECIMAL(15, 2) DEFAULT 0,
  description TEXT,
  reference_number TEXT,
  attachment_url TEXT,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  transaction_time TIMESTAMPTZ DEFAULT NOW(),
  is_synced BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cash positions table (daily cash tracking)
CREATE TABLE cash_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  opening_balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  closing_balance DECIMAL(15, 2) DEFAULT 0,
  total_cash_received DECIMAL(15, 2) DEFAULT 0,
  total_cash_given DECIMAL(15, 2) DEFAULT 0,
  total_fees_earned DECIMAL(15, 2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Daily summaries table (for dashboard analytics)
CREATE TABLE daily_summaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_transactions INTEGER DEFAULT 0,
  cash_in_count INTEGER DEFAULT 0,
  cash_out_count INTEGER DEFAULT 0,
  cash_in_amount DECIMAL(15, 2) DEFAULT 0,
  cash_out_amount DECIMAL(15, 2) DEFAULT 0,
  fees_earned DECIMAL(15, 2) DEFAULT 0,
  loans_given DECIMAL(15, 2) DEFAULT 0,
  loans_received DECIMAL(15, 2) DEFAULT 0,
  expenses DECIMAL(15, 2) DEFAULT 0,
  income DECIMAL(15, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Settings table (for user preferences)
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, key)
);

-- Activity logs table (for audit trail)
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_type ON accounts(type);
CREATE INDEX idx_accounts_is_active ON accounts(is_active);
CREATE INDEX idx_customers_user_id ON customers(user_id);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_is_active ON customers(is_active);
CREATE INDEX idx_customer_accounts_customer_id ON customer_accounts(customer_id);
CREATE INDEX idx_customer_accounts_is_active ON customer_accounts(is_active);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX idx_transactions_from_account ON transactions(from_account_id);
CREATE INDEX idx_transactions_to_account ON transactions(to_account_id);
CREATE INDEX idx_transactions_is_synced ON transactions(is_synced);
CREATE INDEX idx_cash_positions_user_id ON cash_positions(user_id);
CREATE INDEX idx_cash_positions_date ON cash_positions(date);
CREATE INDEX idx_daily_summaries_user_id ON daily_summaries(user_id);
CREATE INDEX idx_daily_summaries_date ON daily_summaries(date);
CREATE INDEX idx_settings_user_id ON settings(user_id);
CREATE INDEX idx_settings_key ON settings(key);
CREATE INDEX idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Profiles: Users can only see their own profile
CREATE POLICY "Users can only access their own profile"
  ON profiles FOR ALL
  USING (id = auth.uid());

-- Accounts: Users can only see their own accounts
CREATE POLICY "Users can only access their own accounts"
  ON accounts FOR ALL
  USING (user_id = auth.uid());

-- Customers: Users can only see their own customers
CREATE POLICY "Users can only access their own customers"
  ON customers FOR ALL
  USING (user_id = auth.uid());

-- Customer accounts: Users can only see their own customers' accounts
CREATE POLICY "Users can only access their own customer accounts"
  ON customer_accounts FOR ALL
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    )
  );

-- Transactions: Users can only see their own transactions
CREATE POLICY "Users can only access their own transactions"
  ON transactions FOR ALL
  USING (user_id = auth.uid());

-- Cash positions: Users can only see their own cash positions
CREATE POLICY "Users can only access their own cash positions"
  ON cash_positions FOR ALL
  USING (user_id = auth.uid());

-- Daily summaries: Users can only see their own summaries
CREATE POLICY "Users can only access their own daily summaries"
  ON daily_summaries FOR ALL
  USING (user_id = auth.uid());

-- Settings: Users can only see their own settings
CREATE POLICY "Users can only access their own settings"
  ON settings FOR ALL
  USING (user_id = auth.uid());

-- Activity logs: Users can only see their own logs
CREATE POLICY "Users can only access their own activity logs"
  ON activity_logs FOR ALL
  USING (user_id = auth.uid());

-- Create function to update account balances
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
  -- For cash_in: Receive cash, send from bank
  -- Cash increases, bank decreases
  IF NEW.type = 'cash_in' THEN
    -- Increase cash account (customer gave us cash)
    UPDATE accounts SET current_balance = current_balance + NEW.amount 
    WHERE user_id = NEW.user_id AND type = 'cash';
    -- Decrease bank account (we sent to customer)
    UPDATE accounts SET current_balance = current_balance - NEW.amount 
    WHERE id = NEW.from_account_id;
  
  -- For cash_out: Give cash, receive in bank
  -- Cash decreases, bank increases
  ELSIF NEW.type = 'cash_out' THEN
    -- Decrease cash account (we gave cash to customer)
    UPDATE accounts SET current_balance = current_balance - NEW.amount 
    WHERE user_id = NEW.user_id AND type = 'cash';
    -- Increase bank account (customer sent to us)
    UPDATE accounts SET current_balance = current_balance + NEW.amount 
    WHERE id = NEW.to_account_id;
  
  -- For cash_in_physical: Add physical cash to cash box
  -- Only cash account increases, no bank involved
  ELSIF NEW.type = 'cash_in_physical' THEN
    UPDATE accounts SET current_balance = current_balance + NEW.amount 
    WHERE user_id = NEW.user_id AND type = 'cash';
  
  -- For cash_out_physical: Remove physical cash from cash box
  -- Only cash account decreases, no bank involved
  ELSIF NEW.type = 'cash_out_physical' THEN
    UPDATE accounts SET current_balance = current_balance - NEW.amount 
    WHERE user_id = NEW.user_id AND type = 'cash';
  
  -- For cash_in_personal: Personal cash in
  -- Physical: Add to Cash on Hand | Digital: Add to selected account
  ELSIF NEW.type = 'cash_in_personal' THEN
    IF NEW.subcategory = 'physical' THEN
      -- Physical cash - add to Cash on Hand
      UPDATE accounts SET current_balance = current_balance + NEW.amount 
      WHERE user_id = NEW.user_id AND type = 'cash';
    ELSIF NEW.subcategory = 'digital' THEN
      -- Digital cash - add to selected account (bank/wallet)
      UPDATE accounts SET current_balance = current_balance + NEW.amount 
      WHERE id = NEW.to_account_id;
    END IF;
  
  -- For cash_out_personal: Personal cash out
  -- Physical: Remove from Cash on Hand | Digital: Remove from selected account
  ELSIF NEW.type = 'cash_out_personal' THEN
    IF NEW.subcategory = 'physical' THEN
      -- Physical cash - remove from Cash on Hand
      UPDATE accounts SET current_balance = current_balance - NEW.amount 
      WHERE user_id = NEW.user_id AND type = 'cash';
    ELSIF NEW.subcategory = 'digital' THEN
      -- Digital cash - remove from selected account (bank/wallet)
      UPDATE accounts SET current_balance = current_balance - NEW.amount 
      WHERE id = NEW.from_account_id;
    END IF;
  
  -- For account_transfer: Decrease from, increase to
  ELSIF NEW.type = 'account_transfer' THEN
    UPDATE accounts SET current_balance = current_balance - NEW.amount WHERE id = NEW.from_account_id;
    UPDATE accounts SET current_balance = current_balance + NEW.amount WHERE id = NEW.to_account_id;
  
  -- For loan_given: Decrease from account
  ELSIF NEW.type = 'loan_given' THEN
    UPDATE accounts SET current_balance = current_balance - NEW.amount WHERE id = NEW.from_account_id;
  
  -- For loan_received: Increase to account
  ELSIF NEW.type = 'loan_received' THEN
    UPDATE accounts SET current_balance = current_balance + NEW.amount WHERE id = NEW.to_account_id;
  
  -- For expense: Decrease from account
  ELSIF NEW.type = 'expense' THEN
    UPDATE accounts SET current_balance = current_balance - NEW.amount WHERE id = NEW.from_account_id;
  
  -- For income: Increase to account
  ELSIF NEW.type = 'income' THEN
    UPDATE accounts SET current_balance = current_balance + NEW.amount WHERE id = NEW.to_account_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update balances
CREATE TRIGGER update_balance_on_transaction
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_account_balance();

-- Create function to update cash position
CREATE OR REPLACE FUNCTION update_cash_position()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_date DATE;
BEGIN
  v_user_id := NEW.user_id;
  v_date := NEW.transaction_date;
  
  -- For cash_in: Customer gives cash, we send to their account
  -- Cash increases (we received cash)
  IF NEW.type = 'cash_in' THEN
    INSERT INTO cash_positions (user_id, date, total_cash_received)
    VALUES (v_user_id, v_date, NEW.amount)
    ON CONFLICT (user_id, date)
    DO UPDATE SET 
      total_cash_received = cash_positions.total_cash_received + NEW.amount,
      total_fees_earned = cash_positions.total_fees_earned + NEW.fee_amount,
      updated_at = NOW();
  
  -- For cash_out: Customer sends to our account, we give cash
  -- Cash decreases (we gave cash)
  ELSIF NEW.type = 'cash_out' THEN
    INSERT INTO cash_positions (user_id, date, total_cash_given)
    VALUES (v_user_id, v_date, NEW.amount)
    ON CONFLICT (user_id, date)
    DO UPDATE SET 
      total_cash_given = cash_positions.total_cash_given + NEW.amount,
      total_fees_earned = cash_positions.total_fees_earned + NEW.fee_amount,
      updated_at = NOW();
  
  -- For cash_in_physical: Add physical cash to cash box
  -- Cash received increases
  ELSIF NEW.type = 'cash_in_physical' THEN
    INSERT INTO cash_positions (user_id, date, total_cash_received)
    VALUES (v_user_id, v_date, NEW.amount)
    ON CONFLICT (user_id, date)
    DO UPDATE SET 
      total_cash_received = cash_positions.total_cash_received + NEW.amount,
      updated_at = NOW();
  
  -- For cash_out_physical: Remove physical cash from cash box
  -- Cash given increases
  ELSIF NEW.type = 'cash_out_physical' THEN
    INSERT INTO cash_positions (user_id, date, total_cash_given)
    VALUES (v_user_id, v_date, NEW.amount)
    ON CONFLICT (user_id, date)
    DO UPDATE SET 
      total_cash_given = cash_positions.total_cash_given + NEW.amount,
      updated_at = NOW();
  
  -- For cash_in_personal with physical subcategory: Add to Cash on Hand
  ELSIF NEW.type = 'cash_in_personal' AND NEW.subcategory = 'physical' THEN
    INSERT INTO cash_positions (user_id, date, total_cash_received)
    VALUES (v_user_id, v_date, NEW.amount)
    ON CONFLICT (user_id, date)
    DO UPDATE SET 
      total_cash_received = cash_positions.total_cash_received + NEW.amount,
      updated_at = NOW();
  
  -- For cash_out_personal with physical subcategory: Remove from Cash on Hand
  ELSIF NEW.type = 'cash_out_personal' AND NEW.subcategory = 'physical' THEN
    INSERT INTO cash_positions (user_id, date, total_cash_given)
    VALUES (v_user_id, v_date, NEW.amount)
    ON CONFLICT (user_id, date)
    DO UPDATE SET 
      total_cash_given = cash_positions.total_cash_given + NEW.amount,
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for cash position updates
CREATE TRIGGER update_cash_position_on_transaction
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_cash_position();

-- Create function to update daily summary
CREATE OR REPLACE FUNCTION update_daily_summary()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_date DATE;
BEGIN
  v_user_id := NEW.user_id;
  v_date := NEW.transaction_date;
  
  -- Initialize or update daily summary
  INSERT INTO daily_summaries (user_id, date, total_transactions, cash_in_count, cash_out_count, 
                              cash_in_amount, cash_out_amount, fees_earned, loans_given, loans_received, expenses, income)
  VALUES (v_user_id, v_date, 1, 
          CASE WHEN NEW.type IN ('cash_in', 'cash_in_physical', 'cash_in_personal') THEN 1 ELSE 0 END,
          CASE WHEN NEW.type IN ('cash_out', 'cash_out_physical', 'cash_out_personal') THEN 1 ELSE 0 END,
          CASE WHEN NEW.type IN ('cash_in', 'cash_in_physical', 'cash_in_personal') THEN NEW.amount ELSE 0 END,
          CASE WHEN NEW.type IN ('cash_out', 'cash_out_physical', 'cash_out_personal') THEN NEW.amount ELSE 0 END,
          NEW.fee_amount,
          CASE WHEN NEW.type = 'loan_given' THEN NEW.amount ELSE 0 END,
          CASE WHEN NEW.type = 'loan_received' THEN NEW.amount ELSE 0 END,
          CASE WHEN NEW.type = 'expense' THEN NEW.amount ELSE 0 END,
          CASE WHEN NEW.type = 'income' THEN NEW.amount ELSE 0 END)
  ON CONFLICT (user_id, date)
  DO UPDATE SET 
    total_transactions = daily_summaries.total_transactions + 1,
    cash_in_count = daily_summaries.cash_in_count + 
                   CASE WHEN NEW.type IN ('cash_in', 'cash_in_physical', 'cash_in_personal') THEN 1 ELSE 0 END,
    cash_out_count = daily_summaries.cash_out_count + 
                    CASE WHEN NEW.type IN ('cash_out', 'cash_out_physical', 'cash_out_personal') THEN 1 ELSE 0 END,
    cash_in_amount = daily_summaries.cash_in_amount + 
                    CASE WHEN NEW.type IN ('cash_in', 'cash_in_physical', 'cash_in_personal') THEN NEW.amount ELSE 0 END,
    cash_out_amount = daily_summaries.cash_out_amount + 
                     CASE WHEN NEW.type IN ('cash_out', 'cash_out_physical', 'cash_out_personal') THEN NEW.amount ELSE 0 END,
    fees_earned = daily_summaries.fees_earned + NEW.fee_amount,
    loans_given = daily_summaries.loans_given + 
                 CASE WHEN NEW.type = 'loan_given' THEN NEW.amount ELSE 0 END,
    loans_received = daily_summaries.loans_received + 
                     CASE WHEN NEW.type = 'loan_received' THEN NEW.amount ELSE 0 END,
    expenses = daily_summaries.expenses + 
              CASE WHEN NEW.type = 'expense' THEN NEW.amount ELSE 0 END,
    income = daily_summaries.income + 
            CASE WHEN NEW.type = 'income' THEN NEW.amount ELSE 0 END,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for daily summary updates
CREATE TRIGGER update_daily_summary_on_transaction
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_summary();

-- Create function to log activities
CREATE OR REPLACE FUNCTION log_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Log account creation/updates
  IF TG_TABLE_NAME = 'accounts' THEN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id, new_values)
      VALUES (NEW.user_id, 'CREATE', 'account', NEW.id, row_to_json(NEW));
    ELSIF TG_OP = 'UPDATE' THEN
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id, old_values, new_values)
      VALUES (NEW.user_id, 'UPDATE', 'account', NEW.id, row_to_json(OLD), row_to_json(NEW));
    ELSIF TG_OP = 'DELETE' THEN
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id, old_values)
      VALUES (OLD.user_id, 'DELETE', 'account', OLD.id, row_to_json(OLD));
    END IF;
  
  -- Log customer creation/updates
  ELSIF TG_TABLE_NAME = 'customers' THEN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id, new_values)
      VALUES (NEW.user_id, 'CREATE', 'customer', NEW.id, row_to_json(NEW));
    ELSIF TG_OP = 'UPDATE' THEN
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id, old_values, new_values)
      VALUES (NEW.user_id, 'UPDATE', 'customer', NEW.id, row_to_json(OLD), row_to_json(NEW));
    ELSIF TG_OP = 'DELETE' THEN
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id, old_values)
      VALUES (OLD.user_id, 'DELETE', 'customer', OLD.id, row_to_json(OLD));
    END IF;
  
  -- Log transaction creation
  ELSIF TG_TABLE_NAME = 'transactions' THEN
    IF TG_OP = 'INSERT' THEN
      INSERT INTO activity_logs (user_id, action, entity_type, entity_id, new_values)
      VALUES (NEW.user_id, 'CREATE', 'transaction', NEW.id, row_to_json(NEW));
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for activity logging
CREATE TRIGGER log_account_activity
  AFTER INSERT OR UPDATE OR DELETE ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION log_activity();

CREATE TRIGGER log_customer_activity
  AFTER INSERT OR UPDATE OR DELETE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION log_activity();

CREATE TRIGGER log_transaction_activity
  AFTER INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION log_activity();

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (new.id, new.raw_user_meta_data->>'name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create view for dashboard summary
CREATE OR REPLACE VIEW dashboard_summary AS
SELECT 
  u.id as user_id,
  COALESCE(a.total_accounts, 0) as total_accounts,
  COALESCE(c.total_customers, 0) as total_customers,
  COALESCE(t.today_transactions, 0) as today_transactions,
  COALESCE(t.today_amount, 0) as today_amount,
  COALESCE(cp.current_cash, 0) as current_cash,
  COALESCE(ds.total_fees_today, 0) as total_fees_today
FROM auth.users u
LEFT JOIN (
  SELECT user_id, COUNT(*) as total_accounts
  FROM accounts 
  WHERE is_active = true
  GROUP BY user_id
) a ON u.id = a.user_id
LEFT JOIN (
  SELECT user_id, COUNT(*) as total_customers
  FROM customers 
  WHERE is_active = true
  GROUP BY user_id
) c ON u.id = c.user_id
LEFT JOIN (
  SELECT user_id, COUNT(*) as today_transactions, SUM(amount) as today_amount
  FROM transactions 
  WHERE transaction_date = CURRENT_DATE
  GROUP BY user_id
) t ON u.id = t.user_id
LEFT JOIN (
  SELECT user_id, current_balance as current_cash
  FROM accounts 
  WHERE type = 'cash' AND is_active = true
) cp ON u.id = cp.user_id
LEFT JOIN (
  SELECT user_id, fees_earned as total_fees_today
  FROM daily_summaries 
  WHERE date = CURRENT_DATE
) ds ON u.id = ds.user_id;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON accounts TO authenticated;
GRANT ALL ON customers TO authenticated;
GRANT ALL ON customer_accounts TO authenticated;
GRANT ALL ON transactions TO authenticated;
GRANT ALL ON cash_positions TO authenticated;
GRANT ALL ON daily_summaries TO authenticated;
GRANT ALL ON settings TO authenticated;
GRANT ALL ON activity_logs TO authenticated;
GRANT SELECT ON dashboard_summary TO authenticated;

-- Schema setup completed
SELECT 'Complete database schema installed successfully!' as status;
