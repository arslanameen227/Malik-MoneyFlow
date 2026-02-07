-- =====================================================
-- FRESH DATABASE SETUP FOR MALIK MONEYFLOW
-- =====================================================
-- This script creates a complete, error-free database
-- Run this to start fresh with all existing data removed
-- =====================================================

-- Step 1: Drop all existing tables (reverse order due to dependencies)
DROP TABLE IF EXISTS transaction_attachments CASCADE;
DROP TABLE IF EXISTS transaction_descriptions CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS customer_accounts CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS cash_positions CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Step 2: Note about storage bucket
-- Storage buckets need to be managed through Supabase Dashboard or API
-- The bucket will be recreated if it doesn't exist in Step 4

-- Step 3: Create all tables with proper structure

-- 3.1 Profiles Table (User Management)
CREATE TABLE profiles (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3.2 Customers Table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT,
    fee_type TEXT NOT NULL DEFAULT 'percentage' CHECK (fee_type IN ('percentage', 'fixed')),
    fee_value DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
);

-- 3.3 Accounts Table
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('cash', 'bank', 'wallet')),
    opening_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    current_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    account_number TEXT,
    provider TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
);

-- 3.4 Customer Accounts Table
CREATE TABLE customer_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    account_title TEXT NOT NULL,
    account_number TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('bank', 'wallet')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
);

-- 3.5 Transactions Table
CREATE TABLE transactions (
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
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
);

-- 3.6 Transaction Descriptions Table
CREATE TABLE transaction_descriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    sequence_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
);

-- 3.7 Transaction Attachments Table
CREATE TABLE transaction_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE
);

-- 3.8 Cash Positions Table
CREATE TABLE cash_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    opening_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    closing_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_cash_received DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_cash_given DECIMAL(15,2) NOT NULL DEFAULT 0,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW,
    UNIQUE(user_id, date) -- One cash position per user per day
);

-- Step 4: Create Storage Bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('transaction-attachments', 'transaction-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Step 5: Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_positions ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS Policies

-- 6.1 Profiles Policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- 6.2 Customer Policies
CREATE POLICY "Users can view own customers" ON customers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own customers" ON customers FOR ALL USING (auth.uid() = user_id);

-- 6.3 Account Policies
CREATE POLICY "Users can view own accounts" ON accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own accounts" ON accounts FOR ALL USING (auth.uid() = user_id);

-- 6.4 Customer Account Policies
CREATE POLICY "Users can view own customer_accounts" ON customer_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own customer_accounts" ON customer_accounts FOR ALL USING (auth.uid() = user_id);

-- 6.5 Transaction Policies
CREATE POLICY "Users can view own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own transactions" ON transactions FOR ALL USING (auth.uid() = user_id);

-- 6.6 Transaction Description Policies
CREATE POLICY "Users can view own transaction_descriptions" ON transaction_descriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own transaction_descriptions" ON transaction_descriptions FOR ALL USING (auth.uid() = user_id);

-- 6.7 Transaction Attachment Policies
CREATE POLICY "Users can view own transaction_attachments" ON transaction_attachments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own transaction_attachments" ON transaction_attachments FOR ALL USING (auth.uid() = user_id);

-- 6.8 Cash Position Policies
CREATE POLICY "Users can view own cash_positions" ON cash_positions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own cash_positions" ON cash_positions FOR ALL USING (auth.uid() = user_id);

-- Step 7: Storage Policies
CREATE POLICY "Users can upload own transaction attachments" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'transaction-attachments' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own transaction attachments" ON storage.objects FOR SELECT USING (
    bucket_id = 'transaction-attachments' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own transaction attachments" ON storage.objects FOR UPDATE USING (
    bucket_id = 'transaction-attachments' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own transaction attachments" ON storage.objects FOR DELETE USING (
    bucket_id = 'transaction-attachments' AND 
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Step 8: Create Indexes for Performance
CREATE INDEX idx_customers_user_id ON customers(user_id);
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_is_active ON accounts(is_active);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transaction_descriptions_transaction_id ON transaction_descriptions(transaction_id);
CREATE INDEX idx_transaction_attachments_transaction_id ON transaction_attachments(transaction_id);
CREATE INDEX idx_cash_positions_user_id ON cash_positions(user_id);
CREATE INDEX idx_cash_positions_date ON cash_positions(date);

-- Step 9: Create Functions and Triggers

-- 9.1 Function to update sequence order for descriptions
CREATE OR REPLACE FUNCTION update_description_sequence()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE transaction_descriptions 
    SET sequence_order = row_number() OVER (ORDER BY created_at)
    WHERE transaction_id = NEW.transaction_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9.2 Trigger to auto-update sequence order
CREATE TRIGGER update_description_sequence_trigger
    AFTER INSERT ON transaction_descriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_description_sequence();

-- 9.3 Function to validate file type and size
CREATE OR REPLACE FUNCTION validate_file_type()
RETURNS TRIGGER AS $$
BEGIN
    -- Allowed file types: PDF, Images, Documents
    IF NEW.file_type NOT IN (
        'application/pdf',
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/gif',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
    ) THEN
        RAISE EXCEPTION 'File type not allowed: %', NEW.file_type;
    END IF;
    
    -- Max file size: 10MB
    IF NEW.file_size > 10485760 THEN
        RAISE EXCEPTION 'File size too large. Maximum 10MB allowed.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9.4 Trigger for file validation
CREATE TRIGGER validate_file_type_trigger
    BEFORE INSERT ON transaction_attachments
    FOR EACH ROW
    EXECUTE FUNCTION validate_file_type();

-- 9.5 Function to check attachment count (max 3)
CREATE OR REPLACE FUNCTION check_attachment_count()
RETURNS TRIGGER AS $$
DECLARE
    attachment_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO attachment_count
    FROM transaction_attachments 
    WHERE transaction_id = NEW.transaction_id;
    
    IF attachment_count >= 3 THEN
        RAISE EXCEPTION 'Maximum 3 attachments allowed per transaction';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9.6 Trigger for attachment count validation
CREATE TRIGGER check_attachment_count_trigger
    BEFORE INSERT ON transaction_attachments
    FOR EACH ROW
    EXECUTE FUNCTION check_attachment_count();

-- Step 10: Grant Permissions
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON customers TO authenticated;
GRANT ALL ON accounts TO authenticated;
GRANT ALL ON customer_accounts TO authenticated;
GRANT ALL ON transactions TO authenticated;
GRANT ALL ON transaction_descriptions TO authenticated;
GRANT ALL ON transaction_attachments TO authenticated;
GRANT ALL ON cash_positions TO authenticated;
GRANT ALL ON storage.objects TO authenticated;

-- Step 11: Create User Signup Function (Optional)
-- This will automatically create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, role)
    VALUES (new.id, new.email, 
            COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), 
            'user');
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 12: Create User Signup Trigger (Optional)
-- Uncomment these lines if you want automatic profile creation
-- CREATE OR REPLACE TRIGGER on_auth_user_created
--     AFTER INSERT ON auth.users
--     FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- DATABASE SETUP COMPLETE
-- =====================================================
-- All tables, indexes, policies, and triggers created
-- Ready for Malik MoneyFlow application
-- =====================================================
