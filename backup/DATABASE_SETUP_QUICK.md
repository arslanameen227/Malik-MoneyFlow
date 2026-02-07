# QUICK DATABASE SETUP GUIDE

## 🚨 YOU MUST RUN THIS SQL IN SUPABASE FIRST

The app won't work until you create the database tables!

### Step-by-Step Instructions:

1. **Go to Supabase Dashboard**
   - URL: https://app.supabase.io/project/saoaxgganghigrvfsnok
   - Login with your Supabase account

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query" button

3. **Copy and Paste the Schema**
   - Open file: `supabase/complete_schema.sql` 
   - Select ALL text (Ctrl+A)
   - Copy (Ctrl+C)
   - Paste into the SQL Editor (Ctrl+V)

4. **Run the SQL**
   - Click the "Run" button (green play icon)
   - Wait for it to complete
   - You should see "Success" and "Complete database schema installed successfully!"

5. **Verify Tables Created**
   Run this test SQL:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```
   
   You should see these tables:
   - accounts
   - activity_logs
   - cash_positions
   - customer_accounts
   - customers
   - daily_summaries
   - profiles
   - settings
   - transactions

6. **Test the App**
   - Refresh your app page
   - Login should work now
   - Try adding a customer

## ❌ If You See "0" or Errors

**Problem**: Schema not installed
**Solution**: Follow steps above carefully

**Common Mistakes:**
- Not clicking "Run" after pasting SQL
- Running only part of the SQL
- Using wrong Supabase project
- Not waiting for SQL to finish

## 🔧 Still Not Working?

Try this simple test SQL first:

```sql
-- Test if you can create tables
CREATE TABLE IF NOT EXISTS test_table (id UUID PRIMARY KEY DEFAULT gen_random_uuid());
SELECT * FROM test_table;
DROP TABLE test_table;
```

If this works, then run the complete schema.
