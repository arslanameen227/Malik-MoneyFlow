# Money Flow & Account Management Documentation

## Overview

This document provides a comprehensive guide to understanding how money flows between accounts in the Malik MoneyFlow system. The system tracks transactions across multiple account types with automatic balance updates and cash position tracking.

---

## Account Types

The system supports three account types defined in the `account_type` ENUM:

| Type | Description | Examples |
|------|-------------|----------|
| `cash` | Physical cash on hand | Cash box, drawer, safe |
| `bank` | Traditional banking accounts | Checking, savings accounts |
| `wallet` | Digital wallets | JazzCash, EasyPaisa, other mobile wallets |

### Account Structure (accounts table)

```sql
CREATE TABLE accounts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,           -- e.g., "Cash Box", "HBL Bank", "JazzCash"
  type account_type NOT NULL,   -- cash | bank | wallet
  opening_balance DECIMAL(15, 2) DEFAULT 0,
  current_balance DECIMAL(15, 2) DEFAULT 0,
  account_number TEXT,          -- For bank/wallet accounts
  provider TEXT,                -- Bank name or wallet provider
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

---

## Transaction Types & Money Flow

### 1. Cash In (Send to Customer) - `cash_in`

**Scenario:** Customer gives you physical cash, you send money to their bank/wallet account.

**Flow:**
```
Customer (Cash) → You (Cash Account ↑) → Customer's Bank/Wallet
                                    ↓
                           Your Bank Account ↓ (decreases)
```

**Balance Impact:**
- Cash account (yours): **+amount** (increases)
- From account (bank/wallet): **-amount** (decreases)

**Cash Position Impact:**
- `total_cash_received`: **+amount**

---

### 2. Cash Out (Receive from Customer) - `cash_out`

**Scenario:** Customer sends money to your bank/wallet, you give them physical cash.

**Flow:**
```
Customer's Bank/Wallet → Your Bank Account ↑ (increases)
                                    ↓
                           You (Cash Account ↓) → Customer (Cash)
```

**Balance Impact:**
- Cash account (yours): **-amount** (decreases)
- To account (bank/wallet): **+amount** (increases)

**Cash Position Impact:**
- `total_cash_given`: **+amount**

---

### 3. Cash In Physical - `cash_in_physical`

**Scenario:** Adding physical cash to your cash box (no bank involvement).

**Flow:**
```
External Source → Cash Account ↑ (increases)
```

**Balance Impact:**
- Cash account: **+amount**

**Cash Position Impact:**
- `total_cash_received`: **+amount**

**Use Cases:**
- Depositing personal cash into business
- Converting digital money to physical cash

---

### 4. Cash Out Physical - `cash_out_physical`

**Scenario:** Removing physical cash from your cash box (no bank involvement).

**Flow:**
```
Cash Account ↓ (decreases) → External Destination
```

**Balance Impact:**
- Cash account: **-amount**

**Cash Position Impact:**
- `total_cash_given`: **+amount**

**Use Cases:**
- Withdrawing cash for personal use
- Converting physical cash to digital

---

### 5. Cash In Personal - `cash_in_personal`

**Scenario:** Personal money coming into the system (subcategorized).

#### Physical Subcategory
**Flow:**
```
Personal Source → Cash Account ↑ (increases)
```

- Cash account: **+amount**
- Cash Position: `total_cash_received` **+amount**

#### Digital Subcategory
**Flow:**
```
Personal Source → Bank/Wallet Account ↑ (increases)
```

- To account (bank/wallet): **+amount**
- No cash position impact (digital transaction)

---

### 6. Cash Out Personal - `cash_out_personal`

**Scenario:** Personal money going out of the system (subcategorized).

#### Physical Subcategory
**Flow:**
```
Cash Account ↓ (decreases) → Personal Destination
```

- Cash account: **-amount**
- Cash Position: `total_cash_given` **+amount**

#### Digital Subcategory
**Flow:**
```
Bank/Wallet Account ↓ (decreases) → Personal Destination
```

- From account (bank/wallet): **-amount**
- No cash position impact (digital transaction)

---

### 7. Account Transfer - `account_transfer`

**Scenario:** Moving money between your own accounts.

**Flow:**
```
From Account ↓ (decreases) → To Account ↑ (increases)
```

**Balance Impact:**
- From account: **-amount**
- To account: **+amount**

**Cash Position Impact:**
- None (internal transfer, no physical cash movement)

**Examples:**
- Bank to Wallet
- Wallet to Bank
- Cash to Bank (deposit)
- Bank to Cash (withdrawal)

---

### 8. Loan Given - `loan_given`

**Scenario:** Giving a loan to a customer from an account.

**Flow:**
```
From Account ↓ (decreases) → Customer (Receives loan)
```

**Balance Impact:**
- From account: **-amount**

**Cash Position Impact:**
- None (unless from cash account, handled by separate trigger logic)

---

### 9. Loan Received - `loan_received`

**Scenario:** Receiving loan repayment from a customer to an account.

**Flow:**
```
Customer (Repays) → To Account ↑ (increases)
```

**Balance Impact:**
- To account: **+amount**

---

### 10. Expense - `expense`

**Scenario:** Business expense payment from an account.

**Flow:**
```
From Account ↓ (decreases) → Expense/Vendor
```

**Balance Impact:**
- From account: **-amount**

---

### 11. Income - `income`

**Scenario:** Other business income to an account.

**Flow:**
```
Income Source → To Account ↑ (increases)
```

**Balance Impact:**
- To account: **+amount**

---

## Database Triggers

### Trigger 1: update_account_balance()

This trigger automatically updates account balances after each transaction insertion.

**Location:** Lines 152-237 in `supabase/schema.sql`

**Logic Summary:**
```sql
-- Cash In: Cash ↑, Bank ↓
-- Cash Out: Cash ↓, Bank ↑
-- Physical In/Out: Cash only
-- Personal In (Physical): Cash ↑
-- Personal In (Digital): Bank/Wallet ↑
-- Personal Out (Physical): Cash ↓
-- Personal Out (Digital): Bank/Wallet ↓
-- Transfer: From ↓, To ↑
-- Loan/Expense: Source ↓
-- Loan Received/Income: Destination ↑
```

### Trigger 2: update_cash_position()

This trigger tracks daily physical cash movements in the `cash_positions` table.

**Location:** Lines 246-316 in `supabase/schema.sql`

**Tracked Transactions:**
- `cash_in` → total_cash_received ↑
- `cash_out` → total_cash_given ↑
- `cash_in_physical` → total_cash_received ↑
- `cash_out_physical` → total_cash_given ↑
- `cash_in_personal` (physical) → total_cash_received ↑
- `cash_out_personal` (physical) → total_cash_given ↑

**Cash Positions Table:**
```sql
CREATE TABLE cash_positions (
  id UUID PRIMARY KEY,
  user_id UUID,
  date DATE,
  opening_balance DECIMAL(15, 2),
  closing_balance DECIMAL(15, 2),
  total_cash_received DECIMAL(15, 2),
  total_cash_given DECIMAL(15, 2),
  UNIQUE(user_id, date)
);
```

---

## Transaction Data Model

```typescript
interface Transaction {
  id: string;
  type: TransactionType;
  subcategory?: 'physical' | 'digital' | null;  // For personal transactions
  from_account_id?: string | null;  // Source account
  to_account_id?: string | null;   // Destination account
  customer_id?: string | null;      // Related customer
  customer_account_id?: string | null;  // Customer's bank/wallet
  amount: number;
  fee_amount: number;
  description?: string;
  transaction_date: string;
  created_at: string;
  user_id: string;
}
```

### Required Fields by Transaction Type

| Transaction Type | From Account | To Account | Customer | Subcategory |
|------------------|--------------|------------|----------|-------------|
| `cash_in` | Required | - | Required | - |
| `cash_out` | - | Required | Required | - |
| `cash_in_physical` | - | - | - | - |
| `cash_out_physical` | - | - | - | - |
| `cash_in_personal` | - | Required* | - | Required |
| `cash_out_personal` | Required* | - | - | Required |
| `account_transfer` | Required | Required | - | - |
| `loan_given` | Required | - | Required | - |
| `loan_received` | - | Required | Required | - |
| `expense` | Required | - | - | - |
| `income` | - | Required | - | - |

*For digital subcategory only

---

## Visual Money Flow Diagrams

### Standard Business Flows

```
┌─────────────────────────────────────────────────────────────┐
│                    CASH IN (Send to Customer)                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│   Customer Cash ──────→ Cash Box ↑ ──────→ Customer Bank    │
│                         (increase)                            │
│                            ↓                                  │
│                      Your Bank ↓ (decrease)                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   CASH OUT (Receive from Customer)            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│   Customer Bank ──────→ Your Bank ↑ ──────→ Cash Box ↓       │
│                         (increase)        (decrease)          │
│                              ↓                                │
│                         Customer Cash                         │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Personal Transactions

```
┌─────────────────────────────────────────────────────────────┐
│                 CASH IN PERSONAL (Physical)                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│   Personal Source ───────────────────→ Cash Box ↑            │
│                                        (increase)             │
│                                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 CASH IN PERSONAL (Digital)                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│   Personal Source ───────────────────→ Bank/Wallet ↑         │
│                                        (increase)             │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Internal Transfers

```
┌─────────────────────────────────────────────────────────────┐
│                   ACCOUNT TRANSFER                            │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│   ┌───────────┐                              ┌───────────┐   │
│   │  Source   │  ───── amount ─────→         │   Dest    │   │
│   │  Account  │           │                  │  Account  │   │
│   │    ↓      │           │                  │    ↑      │   │
│   │  -amount  │◄──────────┘                  │  +amount  │   │
│   └───────────┘                              └───────────┘   │
│                                                               │
│   Examples:                                                   │
│   • Bank → Wallet                                             │
│   • Wallet → Bank                                             │
│   • Cash → Bank (deposit)                                     │
│   • Bank → Cash (withdrawal)                                  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Balance Calculation Formula

### Current Balance
```
current_balance = opening_balance 
                  + SUM(all incoming transactions)
                  - SUM(all outgoing transactions)
```

### Cash Position Calculation
```
closing_balance = opening_balance
                  + total_cash_received
                  - total_cash_given
```

---

## Common Scenarios

### Scenario 1: Daily Operations

**Morning:** Opening cash balance = 50,000 PKR

**Transactions:**
1. Cash In (Customer A): 10,000 PKR
   - Cash: +10,000
   - Bank: -10,000
   - Cash Received: +10,000

2. Cash Out (Customer B): 5,000 PKR
   - Cash: -5,000
   - Wallet: +5,000
   - Cash Given: +5,000

3. Expense (Shop rent): 15,000 PKR
   - Bank: -15,000

**Evening Balances:**
- Cash: 50,000 + 10,000 - 5,000 = 55,000 PKR
- Closing Cash Position: 50,000 + 10,000 - 5,000 = 55,000 PKR

---

### Scenario 2: Personal Investment

**Personal Cash In (Physical):** 20,000 PKR
- Cash: +20,000
- Cash Received: +20,000

**Personal Cash In (Digital to Bank):** 30,000 PKR
- Bank: +30,000
- (No cash position impact)

---

### Scenario 3: Account Rebalancing

**Transfer from Wallet to Bank:** 25,000 PKR
- Wallet: -25,000
- Bank: +25,000

---

## Important Notes

1. **Cash Account Special Handling:** The system automatically identifies the cash account by `type = 'cash'` for physical cash transactions.

2. **Fee Tracking:** Each transaction can include a `fee_amount` that represents service charges but doesn't affect the main account balance calculation (separate from the transaction amount).

3. **Date-Based Tracking:** Cash positions are tracked by date (`transaction_date`), allowing daily reconciliation.

4. **User Isolation:** All accounts, transactions, and cash positions are isolated by `user_id` with Row Level Security (RLS) policies.

5. **Automatic Updates:** All balance updates happen automatically through database triggers - no manual balance adjustments needed.

6. **Offline Support:** Transactions can be stored locally when offline and synced when connection is restored.

---

## Related Files

- `supabase/schema.sql` - Database schema and triggers
- `lib/types.ts` - TypeScript type definitions
- `app/transaction/page.tsx` - Transaction creation UI
- `lib/offline-storage.ts` - Offline transaction handling
