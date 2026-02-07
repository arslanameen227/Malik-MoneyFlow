'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { supabaseBrowser } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { clearAllLocalData, isOnline, getPendingTransactions, removePendingTransaction } from '@/lib/offline-storage';
import { Loader2, Wifi, WifiOff, Trash2, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const checkOnline = () => setOnline(isOnline());
    checkOnline();
    window.addEventListener('online', checkOnline);
    window.addEventListener('offline', checkOnline);
    loadPendingCount();
    return () => {
      window.removeEventListener('online', checkOnline);
      window.removeEventListener('offline', checkOnline);
    };
  }, []);

  async function loadPendingCount() {
    const pending = await getPendingTransactions();
    setPendingCount(pending.length);
  }

  async function syncPending() {
    setSyncing(true);
    try {
      const pending = await getPendingTransactions();
      for (const tx of pending) {
        const { error } = await supabaseBrowser.from('transactions').insert({
          user_id: tx.user_id,
          type: tx.type,
          from_account_id: tx.from_account_id,
          to_account_id: tx.to_account_id,
          customer_id: tx.customer_id,
          customer_account_id: tx.customer_account_id,
          amount: tx.amount,
          fee_amount: tx.fee_amount,
          description: tx.description,
          transaction_date: tx.transaction_date,
        });
        if (!error) {
          await removePendingTransaction(tx.id);
        }
      }
      await loadPendingCount();
    } catch (error) {
      console.error('Error syncing:', error);
    } finally {
      setSyncing(false);
    }
  }

  async function clearData() {
    if (!confirm('Clear all local data? This will not delete server data.')) return;
    await clearAllLocalData();
    window.location.reload();
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader><CardTitle>Connection Status</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            {online ? <Wifi className="h-5 w-5 text-green-500" /> : <WifiOff className="h-5 w-5 text-red-500" />}
            <span>{online ? 'Online' : 'Offline'}</span>
            <Badge variant={online ? 'default' : 'secondary'}>{online ? 'Connected' : 'Disconnected'}</Badge>
          </div>
        </CardContent>
      </Card>

      {pendingCount > 0 && (
        <Card>
          <CardHeader><CardTitle>Pending Sync</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                <span>{pendingCount} transactions waiting to sync</span>
              </div>
              <Button size="sm" onClick={syncPending} disabled={syncing || !online}>
                {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Sync Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Data Management</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">Clear all locally cached data. Server data will not be affected.</p>
          <Button variant="destructive" onClick={clearData}>
            <Trash2 className="h-4 w-4 mr-2" /> Clear Local Data
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Account</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email || ''} disabled />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
