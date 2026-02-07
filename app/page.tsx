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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  Receipt, 
  TrendingUp,
  Loader2,
  RefreshCw,
  ArrowRightLeft,
  Plus
} from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';

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

  // Calculate today's summary
  const cashReceived = todayTransactions
    .filter(t => t.type === 'cash_in' || t.type === 'cash_in_physical' || 
      (t.type === 'cash_in_personal' && t.subcategory === 'physical'))
    .reduce((sum, t) => sum + t.amount, 0);
  
  const cashGiven = todayTransactions
    .filter(t => t.type === 'cash_out' || t.type === 'cash_out_physical' || 
      (t.type === 'cash_out_personal' && t.subcategory === 'physical'))
    .reduce((sum, t) => sum + t.amount, 0);
  
  // Detailed breakdowns
  const cashInPersonal = todayTransactions
    .filter(t => t.type === 'cash_in_personal')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const cashOutPersonal = todayTransactions
    .filter(t => t.type === 'cash_out_personal')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const cashInSendToCustomer = todayTransactions
    .filter(t => t.type === 'cash_in')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const cashOutReceiveFromCustomer = todayTransactions
    .filter(t => t.type === 'cash_out')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalFees = todayTransactions.reduce((sum, t) => sum + t.fee_amount, 0);

  // Calculate account totals
  const totalBalance = accounts.reduce((sum, a) => sum + a.current_balance, 0);
  const cashAccount = accounts.find(a => a.type === 'cash');
  const cashBalance = cashAccount?.current_balance || 0;

  // Helper function to get transaction type color
  const getTransactionTypeColor = (type: string) => {
    const moneyInTypes = ['cash_in', 'cash_in_personal', 'cash_in_physical', 'loan_received', 'income'];
    const moneyOutTypes = ['cash_out', 'cash_out_personal', 'cash_out_physical', 'loan_given', 'expense'];
    
    if (moneyInTypes.includes(type)) return 'bg-green-100 text-green-700 hover:bg-green-100';
    if (moneyOutTypes.includes(type)) return 'bg-red-100 text-red-700 hover:bg-red-100';
    return 'bg-gray-100 text-gray-700 hover:bg-gray-100';
  };

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

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Received Today</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(cashReceived)}
            </div>
            <p className="text-xs text-muted-foreground">
              From {todayTransactions.filter(t => t.type === 'cash_in' || t.type === 'cash_in_physical' || 
                (t.type === 'cash_in_personal' && t.subcategory === 'physical')).length} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Given Today</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(cashGiven)}
            </div>
            <p className="text-xs text-muted-foreground">
              From {todayTransactions.filter(t => t.type === 'cash_out' || t.type === 'cash_out_physical' || 
                (t.type === 'cash_out_personal' && t.subcategory === 'physical')).length} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fees Earned Today</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(totalFees)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total profit today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash on Hand</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(cashBalance)}
            </div>
            <p className="text-xs text-muted-foreground">
              Physical cash available
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Breakdown Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash In (Personal)</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-600">
              {formatCurrency(cashInPersonal)}
            </div>
            <p className="text-xs text-muted-foreground">
              From {todayTransactions.filter(t => t.type === 'cash_in_personal').length} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Out (Personal)</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(cashOutPersonal)}
            </div>
            <p className="text-xs text-muted-foreground">
              From {todayTransactions.filter(t => t.type === 'cash_out_personal').length} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash In (Send to Customer)</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(cashInSendToCustomer)}
            </div>
            <p className="text-xs text-muted-foreground">
              From {todayTransactions.filter(t => t.type === 'cash_in').length} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Out (Received from Customer)</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(cashOutReceiveFromCustomer)}
            </div>
            <p className="text-xs text-muted-foreground">
              From {todayTransactions.filter(t => t.type === 'cash_out').length} transactions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Account Balances */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Account Balances
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {accounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    account.type === 'cash' ? 'bg-green-100' : 
                    account.type === 'bank' ? 'bg-blue-100' : 'bg-purple-100'
                  }`}>
                    {account.type === 'cash' ? <Wallet className="h-4 w-4" /> : 
                     account.type === 'bank' ? <Receipt className="h-4 w-4" /> : 
                     <ArrowRightLeft className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="font-medium">{account.name}</p>
                    <p className="text-sm text-muted-foreground">{account.provider || account.type}</p>
                  </div>
                </div>
                <span className="font-bold">{formatCurrency(account.current_balance)}</span>
              </div>
            ))}
            
            {accounts.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                No accounts yet. <Link href="/accounts" className="text-primary underline">Add one</Link>
              </p>
            )}

            <div className="flex justify-between items-center pt-4 border-t">
              <span className="font-medium">Total Balance</span>
              <span className="text-xl font-bold">{formatCurrency(totalBalance)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today's Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Today's Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {todayTransactions.slice(0, 10).map((transaction) => (
              <div 
                key={transaction.id} 
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <Badge 
                    className={`capitalize ${getTransactionTypeColor(transaction.type)}`}
                  >
                    {transaction.type.replace(/_/g, ' ')}
                  </Badge>
                  <div>
                    <p className="font-medium">
                      {transaction.customer?.name || 
                       transaction.from_account?.name || 
                       transaction.to_account?.name || 
                       'Transfer'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {transaction.description || format(new Date(transaction.created_at), 'h:mm a')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatCurrency(transaction.amount)}</p>
                  {transaction.fee_amount > 0 && (
                    <p className="text-xs text-green-600">+{formatCurrency(transaction.fee_amount)} fee</p>
                  )}
                </div>
              </div>
            ))}
            
            {todayTransactions.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No transactions today. <Link href="/transaction" className="text-primary underline">Create one</Link>
              </p>
            )}

            {todayTransactions.length > 10 && (
              <Button variant="ghost" className="w-full" asChild>
                <Link href="/reports">View All Transactions</Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
