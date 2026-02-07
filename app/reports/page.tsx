'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { supabaseBrowser } from '@/lib/supabase';
import { Transaction, Account, TransactionDescription, TransactionAttachment } from '@/lib/types';
import { getLocalTransactions, getLocalAccounts, isOnline } from '@/lib/offline-storage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw, Download, FileSpreadsheet } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import * as XLSX from 'xlsx';
import { EnhancedReportsTable } from '@/components/enhanced-reports-table';

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
      // Get transactions with descriptions and attachments
      const { data: txData } = await supabaseBrowser
        .from('transactions')
        .select(`
          *,
          from_account:accounts!from_account_id(*),
          to_account:accounts!to_account_id(*),
          customer:customers(*),
          descriptions:transaction_descriptions(*),
          attachments:transaction_attachments(*)
        `)
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

  // Enhanced handlers for descriptions and attachments
  const handleAddDescription = async (transactionId: string, description: string) => {
    if (!user) return;
    
    try {
      const { data: newDesc } = await supabaseBrowser
        .from('transaction_descriptions')
        .insert({
          transaction_id: transactionId,
          description,
          sequence_order: 1, // Will be updated based on existing descriptions
        })
        .select()
        .single();

      if (newDesc) {
        // Refresh transaction data
        await syncData();
      }
    } catch (error) {
      console.error('Error adding description:', error);
    }
  };

  const handleAddAttachment = async (transactionId: string, file: File) => {
    if (!user) return;

    try {
      // Upload file to storage
      const fileName = `${transactionId}/${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabaseBrowser.storage
        .from('transaction-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabaseBrowser.storage
        .from('transaction-attachments')
        .getPublicUrl(fileName);

      // Save attachment record
      const { data: attachment } = await supabaseBrowser
        .from('transaction_attachments')
        .insert({
          transaction_id: transactionId,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          file_url: publicUrl,
        })
        .select()
        .single();

      if (attachment) {
        // Refresh transaction data
        await syncData();
      }
    } catch (error) {
      console.error('Error adding attachment:', error);
    }
  };

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

      <EnhancedReportsTable 
        transactions={filteredTransactions}
        onAddDescription={handleAddDescription}
        onAddAttachment={handleAddAttachment}
      />
    </div>
  );
}
