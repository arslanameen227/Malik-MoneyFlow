-- Basic Database Setup for Malik MoneyFlow
-- Run this first to create core tables

-- 1. Profiles Table (for user management)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Customers Table
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    fee_type TEXT NOT NULL DEFAULT 'percentage' CHECK (fee_type IN ('percentage', 'fixed')),
    fee_value DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE
);

-- 3. Accounts Table
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('cash', 'bank', 'wallet')),
    opening_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    current_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    account_number TEXT,
    provider TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE
);

-- 4. Customer Accounts Table
CREATE TABLE IF NOT EXISTS customer_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    account_title TEXT NOT NULL,
    account_number TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('bank', 'wallet')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE
);

-- 5. Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN (
        'cash_in', 'cash_out', 'cash_in_physical', 'cash_out_physical',
        'cash_in_personal', 'cash_out_personal', 'account_transfer',
        'loan_given', 'loan_received', 'expense', 'income'
    )),
    subcategory TEXT CHECK (subcategory IN ('physical', 'digital')),
    from_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    to_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    customer_account_id UUID REFERENCES customer_accounts(id) ON DELETE SET NULL,
    amount DECIMAL(15,2) NOT NULL,
    fee_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    description TEXT,
    transaction_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE
);

-- 6. Transaction Descriptions Table
CREATE TABLE IF NOT EXISTS transaction_descriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    sequence_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE
);

-- 7. Transaction Attachments Table
CREATE TABLE IF NOT EXISTS transaction_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE
);

-- 8. Cash Positions Table
CREATE TABLE IF NOT EXISTS cash_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,
    opening_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    closing_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_cash_received DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_cash_given DECIMAL(15,2) NOT NULL DEFAULT 0,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW
);

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_positions ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own customers" ON customers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own customers" ON customers FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own accounts" ON accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own accounts" ON accounts FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own customer_accounts" ON customer_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own customer_accounts" ON customer_accounts FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own transactions" ON transactions FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own transaction_descriptions" ON transaction_descriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own transaction_descriptions" ON transaction_descriptions FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own transaction_attachments" ON transaction_attachments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own transaction_attachments" ON transaction_attachments FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own cash_positions" ON cash_positions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own cash_positions" ON cash_positions FOR ALL USING (auth.uid() = user_id);

-- Storage bucket for transaction attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('transaction-attachments', 'transaction-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
CREATE POLICY "Users can upload own transaction attachments" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'transaction-attachments' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own transaction attachments" ON storage.objects FOR SELECT USING (
    bucket_id = 'transaction-attachments' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Indexes for better performance
CREATE INDEX idx_customers_user_id ON customers(user_id);
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transaction_descriptions_transaction_id ON transaction_descriptions(transaction_id);
CREATE INDEX idx_transaction_attachments_transaction_id ON transaction_attachments(transaction_id);

-- Grant permissions
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON customers TO authenticated;
GRANT ALL ON accounts TO authenticated;
GRANT ALL ON customer_accounts TO authenticated;
GRANT ALL ON transactions TO authenticated;
GRANT ALL ON transaction_descriptions TO authenticated;
GRANT ALL ON transaction_attachments TO authenticated;
GRANT ALL ON cash_positions TO authenticated;
GRANT ALL ON storage.objects TO authenticated;
