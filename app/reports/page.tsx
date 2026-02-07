'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { supabaseBrowser } from '@/lib/supabase';
import { Transaction, Account } from '@/lib/types';
import { getLocalTransactions, getLocalAccounts, isOnline } from '@/lib/offline-storage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, RefreshCw, Download, FileSpreadsheet } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import * as XLSX from 'xlsx';

export default function ReportsPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [localTransactions, localAccounts] = await Promise.all([
        getLocalTransactions(),
        getLocalAccounts(),
      ]);
      setTransactions(localTransactions);
      setAccounts(localAccounts.filter(a => a.is_active));
      if (isOnline() && user) await syncData();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function syncData() {
    if (!user) return;
    setIsSyncing(true);
    try {
      const { data: txData } = await supabaseBrowser
        .from('transactions')
        .select('*, from_account:accounts!from_account_id(*), to_account:accounts!to_account_id(*), customer:customers(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (txData) setTransactions(txData);
      
      const { data: accData } = await supabaseBrowser
        .from('accounts').select('*').eq('user_id', user.id).eq('is_active', true);
      if (accData) setAccounts(accData);
    } catch (error) {
      console.error('Error syncing:', error);
    } finally {
      setIsSyncing(false);
    }
  }

  const filteredTransactions = transactions.filter(t => {
    const txDate = t.transaction_date;
    return txDate >= startDate && txDate <= endDate;
  });

  const summary = {
    cashIn: filteredTransactions.filter(t => t.type === 'cash_in').reduce((s, t) => s + t.amount, 0),
    cashOut: filteredTransactions.filter(t => t.type === 'cash_out').reduce((s, t) => s + t.amount, 0),
    fees: filteredTransactions.reduce((s, t) => s + t.fee_amount, 0),
    count: filteredTransactions.length,
  };

  function exportToCSV() {
    const headers = ['Date', 'Type', 'Customer', 'Amount', 'Fee', 'From Account', 'To Account', 'Description'];
    const rows = filteredTransactions.map(t => [
      t.transaction_date,
      t.type,
      t.customer?.name || '',
      t.amount,
      t.fee_amount,
      t.from_account?.name || '',
      t.to_account?.name || '',
      t.description || '',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${startDate}-to-${endDate}.csv`;
    a.click();
  }

  function exportToExcel() {
    const data = filteredTransactions.map(t => ({
      Date: t.transaction_date,
      Type: t.type.replace(/_/g, ' '),
      Subcategory: t.subcategory || '',
      Customer: t.customer?.name || '',
      'Customer Account': t.customer_account?.account_title || '',
      Amount: t.amount,
      Fee: t.fee_amount,
      'From Account': t.from_account?.name || '',
      'To Account': t.to_account?.name || '',
      Description: t.description || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
    XLSX.writeFile(wb, `transactions-${startDate}-to-${endDate}.xlsx`);
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reports</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={syncData} disabled={isSyncing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} /> Sync
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Filter by Date Range</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <Button onClick={exportToCSV} variant="outline"><Download className="h-4 w-4 mr-2" /> Export CSV</Button>
            <Button onClick={exportToExcel} variant="outline" className="bg-green-50"><FileSpreadsheet className="h-4 w-4 mr-2" /> Export Excel</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Transactions</p><p className="text-2xl font-bold">{summary.count}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Cash In (Given)</p><p className="text-2xl font-bold text-red-600">{formatCurrency(summary.cashIn)}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Cash Out (Received)</p><p className="text-2xl font-bold text-green-600">{formatCurrency(summary.cashOut)}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Total Fees</p><p className="text-2xl font-bold text-blue-600">{formatCurrency(summary.fees)}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Transactions</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead>From/To</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{format(parseISO(t.transaction_date), 'MMM dd, yyyy')}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{t.type.replace('_', ' ')}</Badge></TableCell>
                  <TableCell>{t.customer?.name || '-'}</TableCell>
                  <TableCell className="font-medium">{formatCurrency(t.amount)}</TableCell>
                  <TableCell className="text-green-600">{t.fee_amount > 0 ? formatCurrency(t.fee_amount) : '-'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {t.from_account?.name || t.to_account?.name || '-'}
                  </TableCell>
                </TableRow>
              ))}
              {filteredTransactions.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No transactions found for this period</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
