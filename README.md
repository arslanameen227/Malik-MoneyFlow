# Money Trade Shop Management System

A comprehensive web application to manage cash flow, accounts, and transactions for a money trade business.

## Features

- **Multi-User Support** - Multiple users can access the system with their own data
- **Account Management** - Manage bank accounts, mobile wallets, and cash on hand with opening balances
- **Customer Management** - Store customer details with custom fee structures (percentage or fixed)
- **Transaction Processing** - Simple one-page transaction entry with multiple types:
  - Cash In: Receive cash → Send to customer account
  - Cash Out: Receive in account → Give cash to customer
  - Account Transfer: Move money between your accounts
  - Loan Given/Received: Track loans
  - Expense/Income: Track business expenses and income
- **Auto-Complete Customer Search** - Quickly find customers by name or phone
- **Auto-Create Customers** - New customers are automatically added when not found
- **Dashboard** - View today's summary: cash received, cash given, fees earned, current cash position
- **Reports** - Filter transactions by date range and export to CSV
- **Offline Support** - Works offline with automatic sync when connection is restored
- **Mobile Responsive** - Use on desktop, tablet, or mobile

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth)
- **Offline Storage**: LocalForage
- **Currency**: Pakistani Rupees (PKR)

## Setup Instructions

### 1. Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Once created, go to Project Settings → API
4. Copy the **Project URL** and **anon/public key**

### 2. Set Up Database Schema

1. In Supabase Dashboard, go to SQL Editor
2. Create a new query
3. Copy the contents of `supabase/schema.sql` from this project
4. Run the query to create all tables, types, and policies

### 3. Configure Environment Variables

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   copy .env.local.example .env.local
   ```

2. Edit `.env.local` and add your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### 4. Run the Application

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Create Your First Account

1. Click "Register" on the login page
2. Create an account with your email and password
3. Log in
4. Go to "Accounts" and add your:
   - Cash on Hand account (for physical cash tracking)
   - Bank accounts
   - Mobile wallets (JazzCash, Easypaisa, etc.)

## Usage Guide

### Daily Workflow

1. **Check Dashboard** - View today's summary and current cash position
2. **Create Transactions** - Use the "New Transaction" page for all transactions
   - Select transaction type from dropdown
   - Search and select customer (auto-creates if not found)
   - Enter amount (fee auto-calculates based on customer settings)
   - Select accounts if needed
   - Save

### Transaction Types Explained

- **Cash In (Send to Customer)**: Customer gives you cash, you send to their bank/wallet
- **Cash Out (Receive from Customer)**: Customer sends to your account, you give them cash
- **Account Transfer**: Move money between your own accounts
- **Loan Given**: Record money lent to a customer
- **Loan Received**: Record loan repayment from customer
- **Expense**: Record business expenses
- **Income**: Record other income

### Managing Customers

- Each customer can have custom fees (percentage or fixed amount)
- Store multiple bank/wallet accounts per customer
- View all customers and their details in the Customers page

### Reports

- View transactions by date range
- Export to CSV for Excel
- Track daily/weekly/monthly performance

### Offline Mode

- The app works offline - all data is stored locally
- When you come back online, click "Sync" to sync with server
- Pending transactions are shown in Settings for manual sync if needed

## Important Notes

- **Currency**: All amounts are in Pakistani Rupees (PKR)
- **Data Security**: Your data is stored in Supabase with Row Level Security (users can only access their own data)
- **Backup**: Regularly export reports to CSV as backup

## Support

For issues or questions, check the Settings page for:
- Connection status
- Pending sync count
- Option to clear local data

## License

MIT License - Free to use for your business.
