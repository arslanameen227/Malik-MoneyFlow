'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, Receipt, ArrowRightLeft } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Account } from '@/lib/types';
import Link from 'next/link';

interface AccountBalancesProps {
  accounts: Account[];
}

export function AccountBalances({ accounts }: AccountBalancesProps) {
  // Calculate account totals
  const totalBalance = accounts.reduce((sum, a) => sum + a.current_balance, 0);

  return (
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
  );
}
