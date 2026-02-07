export type AccountType = 'cash' | 'bank' | 'wallet';
export type TransactionType = 
  | 'cash_in'           // Receive cash from customer → Send to their bank/wallet
  | 'cash_out'          // Receive in bank/wallet → Give cash to customer
  | 'cash_in_physical'  // Add physical cash to cash box (no bank involved)
  | 'cash_out_physical' // Remove physical cash from cash box (no bank involved)
  | 'cash_in_personal'  // Personal cash in (Physical/Digital)
  | 'cash_out_personal' // Personal cash out (Physical/Digital)
  | 'account_transfer'  // Transfer between own accounts
  | 'loan_given'        // Loan given to customer
  | 'loan_received'     // Loan received from customer
  | 'expense'           // Business expense
  | 'income';           // Other income

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  opening_balance: number;
  current_balance: number;
  account_number?: string;
  provider?: string;
  is_active: boolean;
  created_at: string;
  user_id: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  fee_type: 'percentage' | 'fixed';
  fee_value: number;
  created_at: string;
  user_id: string;
}

export interface CustomerAccount {
  id: string;
  customer_id: string;
  account_title: string;
  account_number: string;
  bank_name: string;
  type: 'bank' | 'wallet';
  created_at: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  subcategory?: 'physical' | 'digital' | null;  // For cash_in_personal and cash_out_personal
  from_account_id?: string | null;
  to_account_id?: string | null;
  customer_id?: string | null;
  customer_account_id?: string | null;
  amount: number;
  fee_amount: number;
  description?: string | null;
  transaction_date: string;
  created_at: string;
  user_id: string;
  // Join fields
  from_account?: Account;
  to_account?: Account;
  customer?: Customer;
  customer_account?: CustomerAccount;
}

export interface CashPosition {
  id: string;
  date: string;
  opening_balance: number;
  closing_balance: number;
  total_cash_received: number;
  total_cash_given: number;
  user_id: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'user';
  created_at: string;
}

// For offline storage
export interface PendingTransaction extends Transaction {
  synced: boolean;
  retry_count: number;
}
