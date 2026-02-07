'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { supabaseBrowser } from '@/lib/supabase';
import { Account, AccountType } from '@/lib/types';
import { 
  getLocalAccounts, 
  saveLocalAccount, 
  deleteLocalAccount, 
  clearLocalAccounts,
  isOnline 
} from '@/lib/offline-storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Wallet, Building2, Banknote, Loader2, RefreshCw } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export default function AccountsPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('cash');
  const [openingBalance, setOpeningBalance] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [provider, setProvider] = useState('');

  useEffect(() => {
    loadAccounts();
  }, []);

  async function loadAccounts() {
    setLoading(true);
    try {
      // First load from local storage
      const localAccounts = await getLocalAccounts();
      setAccounts(localAccounts);

      // Then sync with server if online
      if (isOnline() && user) {
        await syncAccounts();
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoading(false);
    }
  }

  async function syncAccounts() {
    if (!user) return;
    setIsSyncing(true);
    try {
      const { data, error } = await supabaseBrowser
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        // Clear local and save fresh data
        await clearLocalAccounts();
        for (const account of data) {
          await saveLocalAccount(account);
        }
        setAccounts(data);
      }
    } catch (error) {
      console.error('Error syncing accounts:', error);
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    const newAccount: Omit<Account, 'id' | 'created_at'> = {
      user_id: user.id,
      name,
      type,
      opening_balance: parseFloat(openingBalance) || 0,
      current_balance: parseFloat(openingBalance) || 0,
      account_number: accountNumber || undefined,
      provider: provider || undefined,
      is_active: true,
    };

    try {
      if (isOnline()) {
        const { data, error } = await supabaseBrowser
          .from('accounts')
          .insert(newAccount)
          .select()
          .single();

        if (error) throw error;
        if (data) {
          await saveLocalAccount(data);
          setAccounts(prev => [data, ...prev]);
        }
      } else {
        // Offline: create with temporary ID
        const offlineAccount: Account = {
          ...newAccount,
          id: `temp-${Date.now()}`,
          created_at: new Date().toISOString(),
        };
        await saveLocalAccount(offlineAccount);
        setAccounts(prev => [offlineAccount, ...prev]);
      }

      // Reset form
      setName('');
      setType('cash');
      setOpeningBalance('');
      setAccountNumber('');
      setProvider('');
      setIsCreateOpen(false);
    } catch (error) {
      console.error('Error creating account:', error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this account?')) return;

    try {
      if (isOnline() && !id.startsWith('temp-')) {
        const { error } = await supabaseBrowser
          .from('accounts')
          .update({ is_active: false })
          .eq('id', id);

        if (error) throw error;
      }

      await deleteLocalAccount(id);
      setAccounts(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error('Error deleting account:', error);
    }
  }

  function getAccountIcon(type: AccountType) {
    switch (type) {
      case 'cash': return <Banknote className="h-5 w-5" />;
      case 'bank': return <Building2 className="h-5 w-5" />;
      case 'wallet': return <Wallet className="h-5 w-5" />;
    }
  }

  function getAccountTypeLabel(type: AccountType) {
    switch (type) {
      case 'cash': return 'Cash on Hand';
      case 'bank': return 'Bank Account';
      case 'wallet': return 'Mobile Wallet';
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Accounts</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={syncAccounts} disabled={isSyncing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            Sync
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Account</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Account Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Main Cash, HBL Bank, JazzCash"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Account Type</Label>
                  <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash on Hand</SelectItem>
                      <SelectItem value="bank">Bank Account</SelectItem>
                      <SelectItem value="wallet">Mobile Wallet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="openingBalance">Opening Balance</Label>
                  <Input
                    id="openingBalance"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    required
                  />
                </div>

                {type !== 'cash' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="provider">Bank / Provider Name</Label>
                      <Input
                        id="provider"
                        placeholder="e.g., HBL, JazzCash, Easypaisa"
                        value={provider}
                        onChange={(e) => setProvider(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accountNumber">Account Number</Label>
                      <Input
                        id="accountNumber"
                        placeholder="Account or IBAN number"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                      />
                    </div>
                  </>
                )}

                <Button type="submit" className="w-full">
                  Create Account
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {accounts.map((account) => (
          <Card key={account.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    {getAccountIcon(account.type)}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{account.name}</CardTitle>
                    <Badge variant="secondary" className="mt-1">
                      {getAccountTypeLabel(account.type)}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => handleDelete(account.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Current Balance</span>
                  <span className="font-semibold">{formatCurrency(account.current_balance)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Opening Balance</span>
                  <span>{formatCurrency(account.opening_balance)}</span>
                </div>
                {account.account_number && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Account #</span>
                    <span className="font-mono text-xs">{account.account_number}</span>
                  </div>
                )}
                {account.provider && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Provider</span>
                    <span>{account.provider}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {accounts.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center text-muted-foreground">
              No accounts yet. Click "Add Account" to create one.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
