export type AccountType = 'cash' | 'bank' | 'wallet';
export type TransactionType = 
  | 'cash_in'           // Receive cash → Send to customer account
  | 'cash_out'          // Receive in account → Give cash to customer
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
  from_account_id?: string;
  to_account_id?: string;
  customer_id?: string;
  customer_account_id?: string;
  amount: number;
  fee_amount: number;
  description?: string;
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
