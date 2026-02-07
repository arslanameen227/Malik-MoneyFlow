'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { supabaseBrowser } from '@/lib/supabase';
import { Account, Customer, CustomerAccount, Transaction, TransactionType } from '@/lib/types';
import { 
  getLocalAccounts, 
  getLocalCustomers, 
  getLocalCustomerAccounts,
  saveLocalTransaction,
  saveLocalCustomer,
  saveLocalCustomerAccount,
  savePendingTransaction,
  isOnline 
} from '@/lib/offline-storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Check, ChevronsUpDown, Plus, Loader2, ArrowRightLeft, Wallet, Banknote, HandCoins, Receipt, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const transactionTypes: { value: TransactionType; label: string; icon: React.ElementType; description: string }[] = [
  { 
    value: 'cash_in', 
    label: 'Cash In (Send to Customer)', 
    icon: ArrowDownCircle,
    description: 'Receive cash from customer → Send to their bank/wallet'
  },
  { 
    value: 'cash_out', 
    label: 'Cash Out (Received from Customer)', 
    icon: ArrowUpCircle,
    description: 'Receive in bank/wallet → Give cash to customer'
  },
  { 
    value: 'cash_in_personal', 
    label: 'Cash In (Personal)', 
    icon: Banknote,
    description: 'Personal cash in - Physical or Digital'
  },
  { 
    value: 'cash_out_personal', 
    label: 'Cash Out (Personal)', 
    icon: Wallet,
    description: 'Personal cash out - Physical or Digital'
  },
  { 
    value: 'cash_in_physical', 
    label: 'Cash In (Physical Money)', 
    icon: Banknote,
    description: 'Add physical cash to cash box (no bank involved)'
  },
  { 
    value: 'cash_out_physical', 
    label: 'Cash Out (Physical Money)', 
    icon: Wallet,
    description: 'Remove physical cash from cash box (no bank involved)'
  },
  { 
    value: 'account_transfer', 
    label: 'Transfer Between Accounts', 
    icon: ArrowRightLeft,
    description: 'Move money between your own accounts'
  },
  { 
    value: 'loan_given', 
    label: 'Loan Given', 
    icon: HandCoins,
    description: 'Give loan to customer'
  },
  { 
    value: 'loan_received', 
    label: 'Loan Received', 
    icon: Receipt,
    description: 'Receive loan repayment from customer'
  },
  { 
    value: 'expense', 
    label: 'Expense', 
    icon: Wallet,
    description: 'Business expense payment'
  },
  { 
    value: 'income', 
    label: 'Income', 
    icon: Banknote,
    description: 'Other business income'
  },
];

export default function TransactionPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerAccounts, setCustomerAccounts] = useState<CustomerAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Transaction form state
  const [transactionType, setTransactionType] = useState<TransactionType>('cash_in');
  const [subcategory, setSubcategory] = useState<'physical' | 'digital'>('physical');
  const [amount, setAmount] = useState('');
  const [fee, setFee] = useState('');
  const [description, setDescription] = useState('');
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  
  // Customer search state
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerInput, setCustomerInput] = useState('');
  
  // Customer account selection
  const [selectedCustomerAccount, setSelectedCustomerAccount] = useState<CustomerAccount | null>(null);
  
  // New customer dialog
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerFeeType, setNewCustomerFeeType] = useState<'percentage' | 'fixed'>('fixed');
  const [newCustomerFeeValue, setNewCustomerFeeValue] = useState('');
  const [newAccountTitle, setNewAccountTitle] = useState('');
  const [newAccountNumber, setNewAccountNumber] = useState('');
  const [newBankName, setNewBankName] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Auto-calculate fee when customer is selected and amount entered
    if (selectedCustomer && amount) {
      const amountNum = parseFloat(amount);
      if (selectedCustomer.fee_type === 'percentage') {
        const calculatedFee = (amountNum * selectedCustomer.fee_value) / 100;
        setFee(calculatedFee.toFixed(2));
      } else {
        setFee(selectedCustomer.fee_value.toFixed(2));
      }
    }
  }, [selectedCustomer, amount]);

  useEffect(() => {
    // Load customer accounts when customer is selected
    if (selectedCustomer) {
      loadCustomerAccounts(selectedCustomer.id);
    } else {
      setCustomerAccounts([]);
      setSelectedCustomerAccount(null);
    }
  }, [selectedCustomer]);

  async function loadData() {
    try {
      const [localAccounts, localCustomers] = await Promise.all([
        getLocalAccounts(),
        getLocalCustomers(),
      ]);
      
      // Filter only active accounts
      setAccounts(localAccounts.filter(a => a.is_active));
      setCustomers(localCustomers);

      // Sync with server if online
      if (isOnline() && user) {
        await syncData();
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function syncData() {
    if (!user) return;
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

      // Sync customers
      const { data: customersData } = await supabaseBrowser
        .from('customers')
        .select('*')
        .eq('user_id', user.id);
      
      if (customersData) {
        setCustomers(customersData);
      }
    } catch (error) {
      console.error('Error syncing data:', error);
    }
  }

  async function loadCustomerAccounts(customerId: string) {
    try {
      const accounts = await getLocalCustomerAccounts(customerId);
      setCustomerAccounts(accounts);
      
      if (isOnline()) {
        const { data } = await supabaseBrowser
          .from('customer_accounts')
          .select('*')
          .eq('customer_id', customerId);
        
        if (data) {
          setCustomerAccounts(data);
        }
      }
    } catch (error) {
      console.error('Error loading customer accounts:', error);
    }
  }

  function handleCustomerSelect(customer: Customer) {
    setSelectedCustomer(customer);
    setCustomerInput(customer.name);
    setCustomerSearchOpen(false);
  }

  function handleCreateNewCustomer() {
    if (!customerInput.trim()) return;
    setNewCustomerName(customerInput);
    setIsNewCustomerOpen(true);
    setCustomerSearchOpen(false);
  }

  async function saveNewCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    const customerData = {
      user_id: user.id,
      name: newCustomerName,
      phone: newCustomerPhone || null,
      fee_type: newCustomerFeeType,
      fee_value: parseFloat(newCustomerFeeValue) || 0,
    };

    try {
      let customerId: string;
      let customer: Customer;

      if (isOnline()) {
        const { data, error } = await supabaseBrowser
          .from('customers')
          .insert(customerData)
          .select()
          .single();

        if (error) throw error;
        customer = data;
        customerId = data.id;
        await saveLocalCustomer(data);
      } else {
        customerId = `temp-${Date.now()}`;
        customer = { ...customerData, id: customerId, created_at: new Date().toISOString() };
        await saveLocalCustomer(customer);
      }

      // Create customer account if details provided
      if (newAccountNumber) {
        const accountData = {
          customer_id: customerId,
          account_title: newAccountTitle || newCustomerName,
          account_number: newAccountNumber,
          bank_name: newBankName || 'Bank',
          type: 'bank' as const,
        };

        if (isOnline()) {
          const { data: accData } = await supabaseBrowser
            .from('customer_accounts')
            .insert(accountData)
            .select()
            .single();
          
          if (accData) {
            await saveLocalCustomerAccount(accData);
          }
        } else {
          await saveLocalCustomerAccount({
            ...accountData,
            id: `temp-acc-${Date.now()}`,
            created_at: new Date().toISOString(),
          });
        }
      }

      setCustomers(prev => [...prev, customer]);
      setSelectedCustomer(customer);
      setCustomerInput(customer.name);
      
      // Reset new customer form
      setNewCustomerName('');
      setNewCustomerPhone('');
      setNewCustomerFeeType('fixed');
      setNewCustomerFeeValue('');
      setNewAccountTitle('');
      setNewAccountNumber('');
      setNewBankName('');
      setIsNewCustomerOpen(false);
    } catch (error) {
      console.error('Error creating customer:', error);
    }
  }

  function getFilteredCustomers() {
    if (!customerInput.trim()) return customers;
    const search = customerInput.toLowerCase();
    return customers.filter(c => 
      c.name.toLowerCase().includes(search) || 
      c.phone?.toLowerCase().includes(search)
    );
  }

  function resetForm() {
    setAmount('');
    setFee('');
    setDescription('');
    setFromAccountId('');
    setToAccountId('');
    setSubcategory('physical');
    setSelectedCustomer(null);
    setSelectedCustomerAccount(null);
    setCustomerInput('');
    setCustomerAccounts([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    // Validation
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    if (showCustomer && !selectedCustomer) {
      toast.error('Please select a customer');
      return;
    }
    
    if (showFromAccount && !fromAccountId) {
      toast.error('Please select a from account');
      return;
    }
    
    if (showToAccount && !toAccountId) {
      toast.error('Please select a to account');
      return;
    }

    setSaving(true);
    try {
      const transactionData = {
        user_id: user.id,
        type: transactionType,
        subcategory: isPersonalTransaction ? subcategory : null,
        from_account_id: fromAccountId || null,
        to_account_id: toAccountId || null,
        customer_id: selectedCustomer?.id || null,
        customer_account_id: selectedCustomerAccount?.id || null,
        amount: parseFloat(amount) || 0,
        fee_amount: parseFloat(fee) || 0,
        description: description || null,
        transaction_date: new Date().toISOString().split('T')[0],
      };

      console.log('Submitting transaction:', transactionData);

      if (isOnline()) {
        const { data, error } = await supabaseBrowser
          .from('transactions')
          .insert(transactionData)
          .select('*, from_account:accounts!from_account_id(*), to_account:accounts!to_account_id(*), customer:customers(*), customer_account:customer_accounts(*)')
          .single();

        if (error) {
          console.error('Supabase error:', error);
          throw new Error(error.message);
        }
        
        if (data) {
          await saveLocalTransaction(data);
          await syncData();
        }
      } else {
        const pendingTx = {
          ...transactionData,
          id: `temp-${Date.now()}`,
          created_at: new Date().toISOString(),
          synced: false,
          retry_count: 0,
        };
        await savePendingTransaction(pendingTx);
      }

      resetForm();
      toast.success('Transaction saved successfully!');
    } catch (error: any) {
      console.error('Error saving transaction:', error);
      toast.error(error.message || 'Failed to save transaction. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // Determine which fields to show based on transaction type
  const isPersonalTransaction = ['cash_in_personal', 'cash_out_personal'].includes(transactionType);
  const showCustomer = ['cash_in', 'cash_out', 'loan_given', 'loan_received', 'cash_out_personal', 'cash_in_personal'].includes(transactionType);
  const showFromAccount = ['cash_in', 'account_transfer', 'loan_given', 'expense', 'cash_out_personal'].includes(transactionType);
  const showToAccount = ['cash_out', 'account_transfer', 'loan_received', 'income'].includes(transactionType) || 
    (transactionType === 'cash_in_personal' && subcategory === 'digital');
  const showFee = showCustomer;
  const showSubcategory = isPersonalTransaction;
  const showPersonalFromAccount = isPersonalTransaction && subcategory === 'physical' && transactionType === 'cash_out_personal';
  const showPersonalToAccount = isPersonalTransaction && subcategory === 'digital';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">New Transaction</h1>

      <Card>
        <CardHeader>
          <CardTitle>Transaction Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Transaction Type */}
            <div className="space-y-2">
              <Label>Transaction Type</Label>
              <Select value={transactionType} onValueChange={(v) => setTransactionType(v as TransactionType)}>
                <SelectTrigger className="h-14">
                  <SelectValue>
                    <div className="flex items-center gap-3">
                      {(() => {
                        const type = transactionTypes.find(t => t.value === transactionType);
                        const Icon = type?.icon || ArrowRightLeft;
                        return <Icon className="h-5 w-5" />;
                      })()}
                      <div className="text-left">
                        <div className="font-medium">
                          {transactionTypes.find(t => t.value === transactionType)?.label}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {transactionTypes.find(t => t.value === transactionType)?.description}
                        </div>
                      </div>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {transactionTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value} className="h-14">
                      <div className="flex items-center gap-3 py-2">
                        <type.icon className="h-5 w-5" />
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-xs text-muted-foreground">{type.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (PKR)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-lg"
                required
              />
            </div>

            {/* Subcategory for Personal Transactions */}
            {showSubcategory && (
              <div className="space-y-2">
                <Label>Subcategory</Label>
                <Select value={subcategory} onValueChange={(v) => setSubcategory(v as 'physical' | 'digital')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="physical">Physical Cash (Cash on Hand)</SelectItem>
                    <SelectItem value="digital">Digital Cash (Bank/Wallet)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {subcategory === 'physical' 
                    ? 'Physical cash will be added/removed from Cash on Hand automatically'
                    : 'Select a bank account or wallet to receive digital cash'}
                </p>
              </div>
            )}

            {/* Customer Selection */}
            {showCustomer && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Customer</Label>
                  <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={customerSearchOpen}
                        className="w-full justify-between h-12"
                      >
                        <div className="flex items-center gap-2">
                          {selectedCustomer ? (
                            <>
                              <span className="font-medium">{selectedCustomer.name}</span>
                              {selectedCustomer.phone && (
                                <span className="text-muted-foreground">({selectedCustomer.phone})</span>
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground">Search or add customer...</span>
                          )}
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput 
                          placeholder="Type name or phone..." 
                          value={customerInput}
                          onValueChange={setCustomerInput}
                        />
                        <CommandList>
                          <CommandEmpty>
                            <div className="p-2">
                              <Button 
                                variant="ghost" 
                                className="w-full justify-start gap-2"
                                onClick={handleCreateNewCustomer}
                              >
                                <Plus className="h-4 w-4" />
                                Add "{customerInput}" as new customer
                              </Button>
                            </div>
                          </CommandEmpty>
                          <CommandGroup>
                            {getFilteredCustomers().map((customer) => (
                              <CommandItem
                                key={customer.id}
                                value={`${customer.name} ${customer.phone || ''}`}
                                onSelect={() => handleCustomerSelect(customer)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedCustomer?.id === customer.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span>{customer.name}</span>
                                  {customer.phone && (
                                    <span className="text-xs text-muted-foreground">{customer.phone}</span>
                                  )}
                                </div>
                                <Badge variant="secondary" className="ml-auto">
                                  {customer.fee_type === 'percentage' ? `${customer.fee_value}%` : `Rs. ${customer.fee_value}`}
                                </Badge>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Customer Account Selection */}
                {selectedCustomer && customerAccounts.length > 0 && (
                  <div className="space-y-2">
                    <Label>Customer Account</Label>
                    <Select 
                      value={selectedCustomerAccount?.id || ''} 
                      onValueChange={(id) => setSelectedCustomerAccount(customerAccounts.find(a => a.id === id) || null)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select account..." />
                      </SelectTrigger>
                      <SelectContent>
                        {customerAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            <div className="flex flex-col">
                              <span>{account.account_title}</span>
                              <span className="text-xs text-muted-foreground">
                                {account.bank_name} - {account.account_number}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Fee */}
                {showFee && (
                  <div className="space-y-2">
                    <Label htmlFor="fee">Fee (PKR)</Label>
                    <Input
                      id="fee"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={fee}
                      onChange={(e) => setFee(e.target.value)}
                    />
                    {selectedCustomer && (
                      <p className="text-xs text-muted-foreground">
                        Default fee for {selectedCustomer.name}: 
                        {selectedCustomer.fee_type === 'percentage' 
                          ? ` ${selectedCustomer.fee_value}% of amount` 
                          : ` Rs. ${selectedCustomer.fee_value}`}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* From Account */}
            {showFromAccount && (
              <div className="space-y-2">
                <Label>From Account</Label>
                <Select value={fromAccountId} onValueChange={setFromAccountId} required={showFromAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account..." />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts
                      .filter(a => {
                        // For personal digital cash in, only show bank and wallet accounts (not cash)
                        if (transactionType === 'cash_in_personal' && subcategory === 'digital') {
                          return a.type !== 'cash';
                        }
                        return true;
                      })
                      .map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          <div className="flex justify-between items-center w-full">
                            <span>{account.name}</span>
                            <span className="text-muted-foreground ml-4">{formatCurrency(account.current_balance)}</span>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* To Account */}
            {showToAccount && (
              <div className="space-y-2">
                <Label>To Account</Label>
                <Select value={toAccountId} onValueChange={setToAccountId} required={showToAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account..." />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts
                      .filter(a => {
                        // For personal digital cash out, only show bank and wallet accounts (not cash)
                        if (transactionType === 'cash_out_personal' && subcategory === 'digital') {
                          return a.type !== 'cash';
                        }
                        return true;
                      })
                      .map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          <div className="flex justify-between items-center w-full">
                            <span>{account.name}</span>
                            <span className="text-muted-foreground ml-4">{formatCurrency(account.current_balance)}</span>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                placeholder="Add any notes..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Summary */}
            {amount && (
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="font-medium">{formatCurrency(parseFloat(amount) || 0)}</span>
                </div>
                {fee && parseFloat(fee) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Fee:</span>
                    <span className="font-medium text-green-600">+{formatCurrency(parseFloat(fee) || 0)}</span>
                  </div>
                )}
                {fee && parseFloat(fee) > 0 && (
                  <div className="flex justify-between text-sm border-t pt-2">
                    <span className="text-muted-foreground">Total:</span>
                    <span className="font-bold">{formatCurrency((parseFloat(amount) || 0) + (parseFloat(fee) || 0))}</span>
                  </div>
                )}
              </div>
            )}

            {/* Submit */}
            <div className="flex gap-3">
              <Button 
                type="button" 
                variant="outline" 
                className="flex-1"
                onClick={resetForm}
                disabled={saving}
              >
                Clear
              </Button>
              <Button 
                type="submit" 
                className="flex-1"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Transaction'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* New Customer Dialog */}
      <Dialog open={isNewCustomerOpen} onOpenChange={setIsNewCustomerOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveNewCustomer} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="new-name">Name</Label>
              <Input
                id="new-name"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-phone">Phone (Optional)</Label>
              <Input
                id="new-phone"
                value={newCustomerPhone}
                onChange={(e) => setNewCustomerPhone(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-fee-type">Fee Type</Label>
                <Select value={newCustomerFeeType} onValueChange={(v) => setNewCustomerFeeType(v as 'percentage' | 'fixed')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed (Rs.)</SelectItem>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-fee-value">Fee Amount</Label>
                <Input
                  id="new-fee-value"
                  type="number"
                  step="0.01"
                  value={newCustomerFeeValue}
                  onChange={(e) => setNewCustomerFeeValue(e.target.value)}
                  placeholder={newCustomerFeeType === 'percentage' ? '%' : 'Rs.'}
                />
              </div>
            </div>
            
            <div className="border-t pt-4 mt-4">
              <p className="text-sm font-medium mb-2">Customer Bank Account (Optional)</p>
              <div className="space-y-2">
                <Input
                  placeholder="Account Title"
                  value={newAccountTitle}
                  onChange={(e) => setNewAccountTitle(e.target.value)}
                />
                <Input
                  placeholder="Account Number / IBAN"
                  value={newAccountNumber}
                  onChange={(e) => setNewAccountNumber(e.target.value)}
                />
                <Input
                  placeholder="Bank Name"
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                />
              </div>
            </div>

            <Button type="submit" className="w-full">
              Add Customer
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
