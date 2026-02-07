# Fresh Database Setup Files

## 📁 Files Created

1. **`00_fresh_reset.sql`** - Complete database reset script
2. **`01_fresh_schema.sql`** - Fresh database schema creation

## 🚀 How to Use

### Option 1: Complete Fresh Start (Reset Everything)

Run these SQL files in order in your Supabase SQL Editor:

#### Step 1: Reset Database
```sql
-- Run the contents of 00_fresh_reset.sql
-- This deletes ALL existing data and tables
```

#### Step 2: Create Fresh Schema
```sql
-- Run the contents of 01_fresh_schema.sql  
-- This creates all tables, functions, triggers, and policies
```

### Option 2: Use Supabase Dashboard

1. Go to https://app.supabase.io/project/saoaxgganghigrvfsnok
2. Click **SQL Editor** in left sidebar
3. Click **New Query**
4. Copy and paste contents of `00_fresh_reset.sql`
5. Click **Run** (green play button)
6. Wait for "✅ Database completely reset" message
7. Create another new query
8. Copy and paste contents of `01_fresh_schema.sql`
9. Click **Run**
10. Wait for "✅ Fresh database schema installed" message

## ✅ What These Files Include

### Reset Script (00_fresh_reset.sql)
- Drops all triggers
- Drops all functions  
- Drops all views
- Drops all tables (in correct order)
- Drops all indexes
- Drops all custom types
- Removes all RLS policies
- Complete clean slate

### Schema Script (01_fresh_schema.sql)
- ✅ Custom ENUM types (account_type, transaction_type, fee_type, user_role)
- ✅ All 9 tables with proper constraints:
  - profiles
  - accounts
  - customers
  - customer_accounts
  - transactions
  - cash_positions
  - daily_summaries
  - settings
  - activity_logs
- ✅ 20+ performance indexes
- ✅ Row Level Security (RLS) enabled on all tables
- ✅ 10 RLS policies for data isolation
- ✅ 5 functions for business logic:
  - update_account_balance()
  - update_cash_position()
  - update_daily_summary()
  - log_activity()
  - handle_new_user()
- ✅ 7 triggers for automation
- ✅ Dashboard summary view
- ✅ Auto-creation of default Cash on Hand account
- ✅ Complete audit trail logging

## 🔧 Features Included

### Automatic Features
- **Balance Updates**: Account balances auto-update on transactions
- **Cash Tracking**: Daily cash position tracked automatically
- **Daily Summaries**: Dashboard stats updated in real-time
- **Audit Logging**: All changes logged for accountability
- **User Profile**: Auto-created when user signs up
- **Default Account**: Cash on Hand created for each new user

### Security
- **RLS Policies**: Users can only access their own data
- **Data Isolation**: Complete separation between users
- **Audit Trail**: Track who changed what and when

### Transaction Types Supported
- Cash In (Send to Customer)
- Cash Out (Receive from Customer)  
- Cash In Physical (Add to cash box)
- Cash Out Physical (Remove from cash box)
- Cash In Personal (Physical/Digital)
- Cash Out Personal (Physical/Digital)
- Account Transfer
- Loan Given
- Loan Received
- Expense
- Income

## 🧪 Test the Installation

After running both files, test with this SQL:

```sql
-- Check all tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public';

-- Check RLS policies
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';

-- Check triggers
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';
```

Expected: 9 tables, 20+ indexes, 10 policies, 7 triggers

## ⚠️ Important Notes

- **Backup First**: Reset script deletes ALL data permanently
- **Run in Order**: Always run reset first, then schema
- **Single Transaction**: Each file runs as a transaction (all or nothing)
- **Idempotent**: Can run multiple times safely
- **No Data Loss Risk**: Only resets when you explicitly run the reset file

## 🎯 Next Steps After Setup

1. **Create User Account**: Register in the app
2. **Add Accounts**: Create bank accounts, wallets, cash
3. **Add Customers**: Set up customers with fee structures
4. **Start Transactions**: Record cash in/out, transfers, loans
5. **View Dashboard**: See daily summaries and analytics

## 🆘 Troubleshooting

### If you get "permission denied" errors
- Ensure you're using the Supabase project owner account
- Check that you're in the correct project

### If tables already exist errors
- Run the reset script first to clean up
- Or use `DROP TABLE IF EXISTS` manually

### If foreign key constraint errors
- The reset script drops tables in correct order
- If issues persist, check for orphaned records

## 📊 Database Schema Overview

```
users (Supabase Auth)
  ↓
profiles (extends users)
  ↓
accounts (user's bank/wallet/cash accounts)
customers (user's customer database)
  ↓
customer_accounts (customer bank details)
transactions (all financial transactions)
cash_positions (daily cash tracking)
daily_summaries (dashboard analytics)
settings (user preferences)
activity_logs (audit trail)
```

All tables linked to user_id for complete data isolation.
