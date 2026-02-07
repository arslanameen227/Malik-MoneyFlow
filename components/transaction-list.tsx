'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Receipt } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { Transaction } from '@/lib/types';
import Link from 'next/link';

interface TransactionListProps {
  todayTransactions: Transaction[];
}

export function TransactionList({ todayTransactions }: TransactionListProps) {
  // Helper function to get transaction type color
  const getTransactionTypeColor = (type: string) => {
    const moneyInTypes = ['cash_in', 'cash_in_personal', 'cash_in_physical', 'loan_received', 'income'];
    const moneyOutTypes = ['cash_out', 'cash_out_personal', 'cash_out_physical', 'loan_given', 'expense'];
    
    if (moneyInTypes.includes(type)) return 'bg-green-100 text-green-700 hover:bg-green-100';
    if (moneyOutTypes.includes(type)) return 'bg-red-100 text-red-700 hover:bg-red-100';
    return 'bg-gray-100 text-gray-700 hover:bg-gray-100';
  };

  return (
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
  );
}
