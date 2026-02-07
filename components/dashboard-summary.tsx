'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Wallet, 
  Receipt, 
  TrendingUp,
  ArrowRightLeft,
  Banknote
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Transaction } from '@/lib/types';

interface DashboardSummaryProps {
  todayTransactions: Transaction[];
  accounts: any[];
  cashBalance: number;
}

export function DashboardSummary({ todayTransactions, accounts, cashBalance }: DashboardSummaryProps) {
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

  return (
    <>
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
            <Banknote className="h-4 w-4 text-teal-600" />
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
            <Wallet className="h-4 w-4 text-orange-600" />
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
    </>
  );
}
