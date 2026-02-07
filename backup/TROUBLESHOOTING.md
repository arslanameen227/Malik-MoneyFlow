# Troubleshooting Guide

## 🚨 App Stuck on Loading Screen

### Root Causes & Solutions

#### 1. Missing Environment Variables
**Problem**: No `.env.local` file exists
**Solution**:
```bash
# Copy the example file
cp .env.local.example .env.local

# Edit .env.local with your Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

#### 2. Database Not Set Up
**Problem**: Database tables don't exist
**Solution**:
1. Run `supabase/reset_database_simple.sql` in Supabase SQL Editor
2. Run `supabase/complete_schema.sql` to install schema

#### 3. Supabase Connection Issues
**Problem**: Invalid credentials or network issues
**Solution**:
- Verify Supabase URL and anon key are correct
- Check if Supabase project is active
- Ensure RLS policies are properly configured

### Debug Steps

1. **Check Browser Console**
   - Open DevTools (F12)
   - Look for JavaScript errors
   - Check network requests to Supabase

2. **Verify Environment Variables**
   ```bash
   # In development
   echo $NEXT_PUBLIC_SUPABASE_URL
   echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

3. **Test Database Connection**
   - Go to Supabase Dashboard
   - Try SQL Editor: `SELECT COUNT(*) FROM profiles;`
   - Check if tables exist

4. **Check Auth State**
   - Clear browser localStorage
   - Try incognito mode
   - Check if user session exists

### Common Error Messages

#### "relation "profiles" does not exist"
- Database schema not installed
- Run the complete schema SQL

#### "Invalid API key"
- Wrong Supabase credentials
- Check `.env.local` file

#### "Network request failed"
- Supabase project paused
- Check Supabase dashboard status

### Quick Fix Checklist

- [ ] `.env.local` file exists with correct values
- [ ] Database schema installed
- [ ] Supabase project is active
- [ ] RLS policies enabled
- [ ] Browser console shows no errors
- [ ] Network requests to Supabase are successful

### Still Having Issues?

1. Reset everything:
   ```bash
   # Clear local data
   localStorage.clear()
   
   # Reset database
   # Run reset_database_simple.sql
   # Run complete_schema.sql
   ```

2. Create fresh Supabase project
3. Update environment variables
4. Test with minimal setup

### Contact Support

If issues persist:
1. Check browser console errors
2. Export Supabase logs
3. Provide error details in support request
