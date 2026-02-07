import localforage from 'localforage';
import { Account, Customer, CustomerAccount, Transaction, PendingTransaction, CashPosition } from './types';

// Configure localforage instances
const accountsStore = localforage.createInstance({
  name: 'malik-cashflow',
  storeName: 'accounts',
});

const customersStore = localforage.createInstance({
  name: 'malik-cashflow',
  storeName: 'customers',
});

const customerAccountsStore = localforage.createInstance({
  name: 'malik-cashflow',
  storeName: 'customerAccounts',
});

const transactionsStore = localforage.createInstance({
  name: 'malik-cashflow',
  storeName: 'transactions',
});

const pendingTransactionsStore = localforage.createInstance({
  name: 'malik-cashflow',
  storeName: 'pendingTransactions',
});

const cashPositionStore = localforage.createInstance({
  name: 'malik-cashflow',
  storeName: 'cashPosition',
});

// Accounts
export async function getLocalAccounts(): Promise<Account[]> {
  const accounts: Account[] = [];
  await accountsStore.iterate((value: Account) => {
    accounts.push(value);
  });
  return accounts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function saveLocalAccount(account: Account): Promise<void> {
  await accountsStore.setItem(account.id, account);
}

export async function deleteLocalAccount(id: string): Promise<void> {
  await accountsStore.removeItem(id);
}

export async function clearLocalAccounts(): Promise<void> {
  await accountsStore.clear();
}

// Customers
export async function getLocalCustomers(): Promise<Customer[]> {
  const customers: Customer[] = [];
  await customersStore.iterate((value: Customer) => {
    customers.push(value);
  });
  return customers.sort((a, b) => a.name.localeCompare(b.name));
}

export async function saveLocalCustomer(customer: Customer): Promise<void> {
  await customersStore.setItem(customer.id, customer);
}

export async function deleteLocalCustomer(id: string): Promise<void> {
  await customersStore.removeItem(id);
}

export async function clearLocalCustomers(): Promise<void> {
  await customersStore.clear();
}

// Customer Accounts
export async function getLocalCustomerAccounts(customerId?: string): Promise<CustomerAccount[]> {
  const accounts: CustomerAccount[] = [];
  await customerAccountsStore.iterate((value: CustomerAccount) => {
    if (!customerId || value.customer_id === customerId) {
      accounts.push(value);
    }
  });
  return accounts;
}

export async function saveLocalCustomerAccount(account: CustomerAccount): Promise<void> {
  await customerAccountsStore.setItem(account.id, account);
}

export async function deleteLocalCustomerAccount(id: string): Promise<void> {
  await customerAccountsStore.removeItem(id);
}

// Transactions
export async function getLocalTransactions(limit?: number): Promise<Transaction[]> {
  const transactions: Transaction[] = [];
  await transactionsStore.iterate((value: Transaction) => {
    transactions.push(value);
  });
  transactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return limit ? transactions.slice(0, limit) : transactions;
}

export async function getLocalTransactionsByDate(date: string): Promise<Transaction[]> {
  const transactions = await getLocalTransactions();
  return transactions.filter(t => t.transaction_date === date);
}

export async function saveLocalTransaction(transaction: Transaction): Promise<void> {
  await transactionsStore.setItem(transaction.id, transaction);
}

export async function deleteLocalTransaction(id: string): Promise<void> {
  await transactionsStore.removeItem(id);
}

export async function clearLocalTransactions(): Promise<void> {
  await transactionsStore.clear();
}

// Pending Transactions (for offline sync)
export async function getPendingTransactions(): Promise<PendingTransaction[]> {
  const transactions: PendingTransaction[] = [];
  await pendingTransactionsStore.iterate((value: PendingTransaction) => {
    transactions.push(value);
  });
  return transactions.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

export async function savePendingTransaction(transaction: PendingTransaction): Promise<void> {
  await pendingTransactionsStore.setItem(transaction.id, transaction);
}

export async function removePendingTransaction(id: string): Promise<void> {
  await pendingTransactionsStore.removeItem(id);
}

export async function clearPendingTransactions(): Promise<void> {
  await pendingTransactionsStore.clear();
}

// Cash Position
export async function getLocalCashPosition(date: string): Promise<CashPosition | null> {
  return await cashPositionStore.getItem(date);
}

export async function saveLocalCashPosition(position: CashPosition): Promise<void> {
  await cashPositionStore.setItem(position.date, position);
}

export async function getAllLocalCashPositions(): Promise<CashPosition[]> {
  const positions: CashPosition[] = [];
  await cashPositionStore.iterate((value: CashPosition) => {
    positions.push(value);
  });
  return positions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// Clear all data
export async function clearAllLocalData(): Promise<void> {
  await Promise.all([
    accountsStore.clear(),
    customersStore.clear(),
    customerAccountsStore.clear(),
    transactionsStore.clear(),
    pendingTransactionsStore.clear(),
    cashPositionStore.clear(),
  ]);
}

// Check if online
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine;
}
