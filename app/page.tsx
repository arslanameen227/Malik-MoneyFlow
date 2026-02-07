'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { supabaseBrowser } from '@/lib/supabase';
import { Account, Transaction, CashPosition } from '@/lib/types';
import { 
  getLocalAccounts, 
  getLocalTransactions,
  getLocalCashPosition,
  isOnline 
} from '@/lib/offline-storage';
import { Button } from '@/components/ui/button';
import { 
  Loader2,
  RefreshCw,
  Plus
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { DashboardSummary } from '@/components/dashboard-summary';
import { TransactionList } from '@/components/transaction-list';
import { AccountBalances } from '@/components/account-balances';

export default function DashboardPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [todayTransactions, setTodayTransactions] = useState<Transaction[]>([]);
  const [cashPosition, setCashPosition] = useState<CashPosition | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function loadDashboardData() {
    try {
      // Load from local storage first
      const [localAccounts, localTransactions] = await Promise.all([
        getLocalAccounts(),
        getLocalTransactions(),
      ]);

      const activeAccounts = localAccounts.filter(a => a.is_active);
      setAccounts(activeAccounts);

      // Filter today's transactions
      const todayTxs = localTransactions.filter(t => t.transaction_date === today);
      setTodayTransactions(todayTxs);

      // Get cash position
      const cashPos = await getLocalCashPosition(today);
      setCashPosition(cashPos);

      // Sync with server if online
      if (isOnline() && user) {
        await syncData();
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function syncData() {
    if (!user) return;
    setIsSyncing(true);
    try {
      // Sync accounts
      const { data: accountsData } = await supabaseBrowser
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);
      
      if (accountsData) {
        setAccounts(accountsData);
      }

      // Sync today's transactions
      const { data: transactionsData } = await supabaseBrowser
        .from('transactions')
        .select('*, from_account:accounts!from_account_id(*), to_account:accounts!to_account_id(*), customer:customers(*)')
        .eq('user_id', user.id)
        .eq('transaction_date', today)
        .order('created_at', { ascending: false });

      if (transactionsData) {
        setTodayTransactions(transactionsData);
      }

      // Sync cash position
      const { data: cashData } = await supabaseBrowser
        .from('cash_positions')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      if (cashData) {
        setCashPosition(cashData);
      }
    } catch (error) {
      console.error('Error syncing data:', error);
    } finally {
      setIsSyncing(false);
    }
  }

  // Calculate account totals
  const totalBalance = accounts.reduce((sum, a) => sum + a.current_balance, 0);
  const cashAccount = accounts.find(a => a.type === 'cash');
  const cashBalance = cashAccount?.current_balance || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={syncData} disabled={isSyncing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            Sync
          </Button>
          <Button size="sm" asChild>
            <Link href="/transaction">
              <Plus className="h-4 w-4 mr-2" />
              New Transaction
            </Link>
          </Button>
        </div>
      </div>

      {/* Date */}
      <p className="text-muted-foreground">{format(new Date(), 'EEEE, MMMM do, yyyy')}</p>

      {/* Dashboard Summary */}
      <DashboardSummary 
        todayTransactions={todayTransactions}
        accounts={accounts}
        cashBalance={cashBalance}
      />

      {/* Account Balances */}
      <AccountBalances accounts={accounts} />

      {/* Today's Transactions */}
      <TransactionList todayTransactions={todayTransactions} />
    </div>
  );
}
