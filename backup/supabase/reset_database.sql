-- Database Reset Script for Malik MoneyFlow
-- WARNING: This will completely delete all existing data and recreate the database

-- Drop all existing tables in reverse order of dependencies
-- Use IF EXISTS to avoid errors when tables don't exist
DROP TABLE IF EXISTS public.cash_positions CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.customer_accounts CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.accounts CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.daily_summaries CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;
DROP TABLE IF EXISTS public.activity_logs CASCADE;

-- Drop all functions and triggers
DROP FUNCTION IF EXISTS public.update_account_balance() CASCADE;
DROP FUNCTION IF EXISTS public.update_cash_position() CASCADE;
DROP FUNCTION IF EXISTS public.update_daily_summary() CASCADE;
DROP FUNCTION IF EXISTS public.log_activity() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Drop triggers (PostgreSQL doesn't support IF EXISTS with triggers, so use DO block)
DO $$
BEGIN
    -- Drop triggers on transactions table
    IF EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_balance_on_transaction' AND event_object_table = 'transactions') THEN
        DROP TRIGGER update_balance_on_transaction ON public.transactions;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_cash_position_on_transaction' AND event_object_table = 'transactions') THEN
        DROP TRIGGER update_cash_position_on_transaction ON public.transactions;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'update_daily_summary_on_transaction' AND event_object_table = 'transactions') THEN
        DROP TRIGGER update_daily_summary_on_transaction ON public.transactions;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'log_transaction_activity' AND event_object_table = 'transactions') THEN
        DROP TRIGGER log_transaction_activity ON public.transactions;
    END IF;
    
    -- Drop triggers on accounts table
    IF EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'log_account_activity' AND event_object_table = 'accounts') THEN
        DROP TRIGGER log_account_activity ON public.accounts;
    END IF;
    
    -- Drop triggers on customers table
    IF EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'log_customer_activity' AND event_object_table = 'customers') THEN
        DROP TRIGGER log_customer_activity ON public.customers;
    END IF;
    
    -- Drop trigger on auth.users table
    IF EXISTS (SELECT 1 FROM information_schema.triggers WHERE trigger_name = 'on_auth_user_created' AND event_object_table = 'users' AND trigger_schema = 'auth') THEN
        DROP TRIGGER on_auth_user_created ON auth.users;
    END IF;
END $$;

-- Drop all indexes
DROP INDEX IF EXISTS public.idx_accounts_user_id;
DROP INDEX IF EXISTS public.idx_accounts_type;
DROP INDEX IF EXISTS public.idx_accounts_is_active;
DROP INDEX IF EXISTS public.idx_customers_user_id;
DROP INDEX IF EXISTS public.idx_customers_phone;
DROP INDEX IF EXISTS public.idx_customers_is_active;
DROP INDEX IF EXISTS public.idx_customer_accounts_customer_id;
DROP INDEX IF EXISTS public.idx_customer_accounts_is_active;
DROP INDEX IF EXISTS public.idx_transactions_user_id;
DROP INDEX IF EXISTS public.idx_transactions_date;
DROP INDEX IF EXISTS public.idx_transactions_type;
DROP INDEX IF EXISTS public.idx_transactions_customer_id;
DROP INDEX IF EXISTS public.idx_transactions_from_account;
DROP INDEX IF EXISTS public.idx_transactions_to_account;
DROP INDEX IF EXISTS public.idx_transactions_is_synced;
DROP INDEX IF EXISTS public.idx_cash_positions_user_id;
DROP INDEX IF EXISTS public.idx_cash_positions_date;
DROP INDEX IF EXISTS public.idx_daily_summaries_user_id;
DROP INDEX IF EXISTS public.idx_daily_summaries_date;
DROP INDEX IF EXISTS public.idx_settings_user_id;
DROP INDEX IF EXISTS public.idx_settings_key;
DROP INDEX IF EXISTS public.idx_activity_logs_user_id;
DROP INDEX IF EXISTS public.idx_activity_logs_created_at;

-- Drop all policies
DROP POLICY IF EXISTS "Users can only access their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can only access their own accounts" ON public.accounts;
DROP POLICY IF EXISTS "Users can only access their own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can only access their own customer accounts" ON public.customer_accounts;
DROP POLICY IF EXISTS "Users can only access their own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can only access their own cash positions" ON public.cash_positions;
DROP POLICY IF EXISTS "Users can only access their own daily summaries" ON public.daily_summaries;
DROP POLICY IF EXISTS "Users can only access their own settings" ON public.settings;
DROP POLICY IF EXISTS "Users can only access their own activity logs" ON public.activity_logs;

-- Drop view
DROP VIEW IF EXISTS public.dashboard_summary;

-- Drop all types
DROP TYPE IF EXISTS public.account_type;
DROP TYPE IF EXISTS public.transaction_type;
DROP TYPE IF EXISTS public.fee_type;
DROP TYPE IF EXISTS public.user_role;

-- Disable RLS on all tables (if they exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'accounts') THEN
        ALTER TABLE public.accounts DISABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customers') THEN
        ALTER TABLE public.customers DISABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'customer_accounts') THEN
        ALTER TABLE public.customer_accounts DISABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transactions') THEN
        ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cash_positions') THEN
        ALTER TABLE public.cash_positions DISABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'daily_summaries') THEN
        ALTER TABLE public.daily_summaries DISABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'settings') THEN
        ALTER TABLE public.settings DISABLE ROW LEVEL SECURITY;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activity_logs') THEN
        ALTER TABLE public.activity_logs DISABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Reset completed message
SELECT 'Database reset completed. Ready for fresh schema installation.' as status;
