-- ============================================================================
-- FRESH DATABASE RESET SCRIPT
-- Malik MoneyFlow - Money Trade Shop Management System
-- ============================================================================
-- WARNING: This will COMPLETELY DELETE all existing data!
-- Run this first, then run fresh_schema.sql
-- ============================================================================

-- Start transaction
BEGIN;

-- Disable triggers temporarily to avoid cascade issues
SET session_replication_role = replica;

-- ============================================================================
-- STEP 1: Drop all triggers (functions depend on these)
-- ============================================================================

DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN 
        SELECT trigger_name, event_object_table 
        FROM information_schema.triggers 
        WHERE trigger_schema = 'public'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I.%I', 
                      trigger_record.trigger_name, 'public', trigger_record.event_object_table);
    END LOOP;
END $$;

-- Also drop auth triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ============================================================================
-- STEP 2: Drop all functions
-- ============================================================================

DROP FUNCTION IF EXISTS public.update_account_balance() CASCADE;
DROP FUNCTION IF EXISTS public.update_cash_position() CASCADE;
DROP FUNCTION IF EXISTS public.update_daily_summary() CASCADE;
DROP FUNCTION IF EXISTS public.log_activity() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- ============================================================================
-- STEP 3: Drop all views
-- ============================================================================

DROP VIEW IF EXISTS public.dashboard_summary CASCADE;

-- ============================================================================
-- STEP 4: Drop all tables (in reverse dependency order)
-- ============================================================================

DROP TABLE IF EXISTS public.activity_logs CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;
DROP TABLE IF EXISTS public.daily_summaries CASCADE;
DROP TABLE IF EXISTS public.cash_positions CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.customer_accounts CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.accounts CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ============================================================================
-- STEP 5: Drop all indexes (tables cascade these, but just to be safe)
-- ============================================================================

DO $$
DECLARE
    index_record RECORD;
BEGIN
    FOR index_record IN 
        SELECT indexname 
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND indexname LIKE 'idx_%'
    LOOP
        EXECUTE format('DROP INDEX IF EXISTS %I.%I', 'public', index_record.indexname);
    END LOOP;
END $$;

-- ============================================================================
-- STEP 6: Drop all custom types
-- ============================================================================

DROP TYPE IF EXISTS public.account_type CASCADE;
DROP TYPE IF EXISTS public.transaction_type CASCADE;
DROP TYPE IF EXISTS public.fee_type CASCADE;
DROP TYPE IF EXISTS public.user_role CASCADE;

-- ============================================================================
-- STEP 7: Clean up any leftover RLS policies
-- ============================================================================

DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      policy_record.policyname, 'public', policy_record.tablename);
    END LOOP;
END $$;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- ============================================================================
-- RESET COMPLETE
-- ============================================================================

SELECT '✅ Database completely reset. Ready for fresh installation.' as status;
SELECT '➡️  Next: Run fresh_schema.sql to create fresh database' as next_step;

COMMIT;
