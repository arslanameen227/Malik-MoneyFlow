-- Simple Database Reset Script for Malik MoneyFlow
-- WARNING: This will completely delete all existing data and recreate the database

-- Drop all tables in correct dependency order
DROP TABLE IF EXISTS public.activity_logs CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;
DROP TABLE IF EXISTS public.daily_summaries CASCADE;
DROP TABLE IF EXISTS public.cash_positions CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.customer_accounts CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.accounts CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop all functions
DROP FUNCTION IF EXISTS public.update_account_balance() CASCADE;
DROP FUNCTION IF EXISTS public.update_cash_position() CASCADE;
DROP FUNCTION IF EXISTS public.update_daily_summary() CASCADE;
DROP FUNCTION IF EXISTS public.log_activity() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

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

-- Drop view
DROP VIEW IF EXISTS public.dashboard_summary;

-- Drop all types
DROP TYPE IF EXISTS public.account_type;
DROP TYPE IF EXISTS public.transaction_type;
DROP TYPE IF EXISTS public.fee_type;
DROP TYPE IF EXISTS public.user_role;

-- Reset completed message
SELECT 'Database reset completed. Ready for fresh schema installation.' as status;
