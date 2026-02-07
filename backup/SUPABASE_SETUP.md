# Supabase Database Setup Guide

## 🚨 Important: Complete Database Reset

This setup will **completely delete** your existing database and recreate it from scratch. All existing data will be lost.

## Step 1: Access Supabase Dashboard

1. Go to [https://supabase.com](https://supabase.com)
2. Sign in to your account
3. Select your project (or create a new one)
4. Go to **SQL Editor** from the left sidebar

## Step 2: Reset Database (Delete Everything)

1. In the SQL Editor, create a new query
2. Copy and paste the contents of `supabase/reset_database.sql`
3. **⚠️ WARNING**: This will delete all existing data
4. Click **Run** to execute the reset script
5. Wait for the script to complete (you should see "Database reset completed" message)

## Step 3: Install Complete Schema

1. Create a new query in the SQL Editor
2. Copy and paste the contents of `supabase/complete_schema.sql`
3. Click **Run** to execute the schema installation
4. Wait for completion (you should see "Complete database schema installed successfully!" message)

## Step 4: Configure Authentication

1. Go to **Authentication** → **Settings**
2. Under **Site URL**, add your application URL:
   - Development: `http://localhost:3000`
   - Production: `https://your-domain.com`
3. Add additional redirect URLs if needed
4. Enable **Email** authentication (default)

## Step 5: Get Project Credentials

1. Go to **Project Settings** → **API**
2. Copy the **Project URL**
3. Copy the **anon/public key**
4. You'll need these for your environment variables

## Step 6: Configure Environment Variables

Create a `.env.local` file in your project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Replace the placeholders with your actual Supabase credentials.

## Step 7: Test the Setup

1. Install dependencies: `npm install`
2. Run the development server: `npm run dev`
3. Open `http://localhost:3000`
4. Try to register a new account
5. Verify that you can log in and access the dashboard

## Database Schema Overview

The complete schema includes:

### Core Tables
- **profiles** - User profiles and business information
- **accounts** - Bank accounts, wallets, and cash on hand
- **customers** - Customer database with fee structures
- **customer_accounts** - Customer bank/wallet details
- **transactions** - All financial transactions
- **cash_positions** - Daily cash tracking
- **daily_summaries** - Dashboard analytics
- **settings** - User preferences
- **activity_logs** - Audit trail

### Key Features
- **Row Level Security (RLS)** - Users can only access their own data
- **Automatic Balance Updates** - Triggers update account balances on transactions
- **Cash Position Tracking** - Daily cash flow monitoring
- **Activity Logging** - Complete audit trail
- **Dashboard Views** - Pre-built analytics views

### Transaction Types Supported
- `cash_in` - Customer gives cash, you send to their account
- `cash_out` - Customer sends to your account, you give cash
- `cash_in_physical` - Add physical cash to cash box
- `cash_out_physical` - Remove physical cash from cash box
- `cash_in_personal` - Personal cash received
- `cash_out_personal` - Personal cash spent
- `account_transfer` - Transfer between your accounts
- `loan_given` - Money lent to customers
- `loan_received` - Loan repayments
- `expense` - Business expenses
- `income` - Other income

## Troubleshooting

### Common Issues

1. **SQL Execution Errors**
   - Make sure you run the reset script first
   - Check for any syntax errors in the SQL
   - Ensure you have sufficient permissions

2. **Authentication Issues**
   - Verify your environment variables are correct
   - Check that email authentication is enabled
   - Ensure redirect URLs are properly configured

3. **Permission Errors**
   - Make sure RLS policies are correctly applied
   - Check that authenticated users have proper permissions
   - Verify the API keys are correct

### Reset Instructions (If Needed)

If you need to start over, simply repeat Step 2 and Step 3:

1. Run `reset_database.sql` to delete everything
2. Run `complete_schema.sql` to recreate the database

## Production Considerations

1. **Backups**: Enable automatic backups in Supabase settings
2. **Rate Limiting**: Configure appropriate rate limits
3. **Security**: Review RLS policies before going live
4. **Monitoring**: Set up alerts for database performance
5. **SSL**: Ensure SSL is enabled (default in Supabase)

## Support

If you encounter any issues:

1. Check the Supabase logs in the dashboard
2. Review the SQL execution history
3. Verify your environment variables
4. Test with a fresh browser session

## Next Steps

After successful setup:

1. Create your first user account
2. Add your business accounts (cash, banks, wallets)
3. Add some test customers
4. Create sample transactions
5. Explore the dashboard and reports

Your Money Trade Shop Management System is now ready to use! 🎉
