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
  fee_type fee_type DEFAULT 'fixed',
  fee_value DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customer accounts table (bank/wallet details for each customer)
CREATE TABLE customer_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  account_title TEXT NOT NULL,
  account_number TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  type account_type NOT NULL DEFAULT 'bank',
  created_at TIMESTAMPTZ DEFAULT NOW()
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
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
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
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- User profiles table (for additional user info)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  role user_role DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_customers_user_id ON customers(user_id);
CREATE INDEX idx_customer_accounts_customer_id ON customer_accounts(customer_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_customer_id ON transactions(customer_id);
CREATE INDEX idx_cash_positions_user_id ON cash_positions(user_id);
CREATE INDEX idx_cash_positions_date ON cash_positions(date);

-- Enable Row Level Security (RLS)
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
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

-- Profiles: Users can only see their own profile
CREATE POLICY "Users can only access their own profile"
  ON profiles FOR ALL
  USING (id = auth.uid());

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
      updated_at = NOW();
  
  -- For cash_out: Customer sends to our account, we give cash
  -- Cash decreases (we gave cash)
  ELSIF NEW.type = 'cash_out' THEN
    INSERT INTO cash_positions (user_id, date, total_cash_given)
    VALUES (v_user_id, v_date, NEW.amount)
    ON CONFLICT (user_id, date)
    DO UPDATE SET 
      total_cash_given = cash_positions.total_cash_given + NEW.amount,
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
