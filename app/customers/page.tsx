'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { supabaseBrowser } from '@/lib/supabase';
import { Customer, CustomerAccount } from '@/lib/types';
import { 
  getLocalCustomers, 
  getLocalCustomerAccounts,
  saveLocalCustomer,
  saveLocalCustomerAccount,
  deleteLocalCustomer,
  isOnline 
} from '@/lib/offline-storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Phone, Loader2, RefreshCw, ChevronDown, ChevronUp, Search } from 'lucide-react';

export default function CustomersPage() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerAccounts, setCustomerAccounts] = useState<Record<string, CustomerAccount[]>>({});
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [feeType, setFeeType] = useState<'percentage' | 'fixed'>('fixed');
  const [feeValue, setFeeValue] = useState('');
  const [accountTitle, setAccountTitle] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');

  useEffect(() => { loadCustomers(); }, []);

  async function loadCustomers() {
    setLoading(true);
    try {
      const localCustomers = await getLocalCustomers();
      setCustomers(localCustomers);
      const accountsMap: Record<string, CustomerAccount[]> = {};
      for (const customer of localCustomers) {
        accountsMap[customer.id] = await getLocalCustomerAccounts(customer.id);
      }
      setCustomerAccounts(accountsMap);
      if (isOnline() && user) await syncCustomers();
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  }

  async function syncCustomers() {
    if (!user) return;
    setIsSyncing(true);
    try {
      const { data: customersData } = await supabaseBrowser
        .from('customers').select('*').eq('user_id', user.id).order('name');
      if (customersData) {
        setCustomers(customersData);
        const accountsMap: Record<string, CustomerAccount[]> = {};
        for (const customer of customersData) {
          const { data: accountsData } = await supabaseBrowser
            .from('customer_accounts').select('*').eq('customer_id', customer.id);
          accountsMap[customer.id] = accountsData || [];
        }
        setCustomerAccounts(accountsMap);
      }
    } catch (error) {
      console.error('Error syncing customers:', error);
    } finally {
      setIsSyncing(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    const customerData = { user_id: user.id, name, phone: phone || null, fee_type: feeType, fee_value: parseFloat(feeValue) || 0 };
    try {
      let customerId: string;
      if (isOnline()) {
        const { data, error } = await supabaseBrowser.from('customers').insert(customerData).select().single();
        if (error) throw error;
        customerId = data.id;
        await saveLocalCustomer(data);
        setCustomers(prev => [...prev, data]);
      } else {
        customerId = `temp-${Date.now()}`;
        const offlineCustomer = { ...customerData, id: customerId, created_at: new Date().toISOString() };
        await saveLocalCustomer(offlineCustomer);
        setCustomers(prev => [...prev, offlineCustomer]);
      }

      if (accountNumber) {
        const accountData = { customer_id: customerId, account_title: accountTitle || name, account_number: accountNumber, bank_name: bankName || 'Bank', type: 'bank' as const };
        if (isOnline()) {
          const { data: accData } = await supabaseBrowser.from('customer_accounts').insert(accountData).select().single();
          if (accData) {
            await saveLocalCustomerAccount(accData);
            setCustomerAccounts(prev => ({ ...prev, [customerId]: [...(prev[customerId] || []), accData] }));
          }
        } else {
          const offlineAccount = { ...accountData, id: `temp-acc-${Date.now()}`, created_at: new Date().toISOString() };
          await saveLocalCustomerAccount(offlineAccount);
          setCustomerAccounts(prev => ({ ...prev, [customerId]: [...(prev[customerId] || []), offlineAccount] }));
        }
      }

      setName(''); setPhone(''); setFeeType('fixed'); setFeeValue(''); setAccountTitle(''); setAccountNumber(''); setBankName(''); setIsCreateOpen(false);
    } catch (error) {
      console.error('Error creating customer:', error);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure?')) return;
    try {
      if (isOnline() && !id.startsWith('temp-')) await supabaseBrowser.from('customers').delete().eq('id', id);
      await deleteLocalCustomer(id);
      setCustomers(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error('Error deleting customer:', error);
    }
  }

  function toggleExpand(customerId: string) {
    setExpandedCustomer(expandedCustomer === customerId ? null : customerId);
  }

  // Remove duplicates by customer ID and filter by search
  const uniqueCustomers = Array.from(new Map(customers.map(c => [c.id, c])).values());
  const filteredCustomers = uniqueCustomers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.phone && c.phone.includes(searchQuery))
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Customers</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
          <Button variant="outline" size="sm" onClick={syncCustomers} disabled={isSyncing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} /> Sync
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Add Customer</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Add New Customer</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 mt-4">
                <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
                <div className="space-y-2"><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03XX-XXXXXXX" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fee Type</Label>
                    <Select value={feeType} onValueChange={(v) => setFeeType(v as 'percentage' | 'fixed')}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed (Rs.)</SelectItem>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Fee Amount</Label><Input type="number" step="0.01" value={feeValue} onChange={(e) => setFeeValue(e.target.value)} placeholder={feeType === 'percentage' ? '%' : 'Rs.'} /></div>
                </div>
                <div className="border-t pt-4 mt-4">
                  <p className="text-sm font-medium mb-2">Bank Account (Optional)</p>
                  <div className="space-y-2">
                    <Input placeholder="Account Title" value={accountTitle} onChange={(e) => setAccountTitle(e.target.value)} />
                    <Input placeholder="Account Number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} />
                    <Input placeholder="Bank Name" value={bankName} onChange={(e) => setBankName(e.target.value)} />
                  </div>
                </div>
                <Button type="submit" className="w-full">Add Customer</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="space-y-3">
        {filteredCustomers.map((customer) => (
          <Card key={customer.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <span className="text-lg font-semibold">{customer.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold">{customer.name}</h3>
                    {customer.phone && <p className="text-sm text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> {customer.phone}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {customer.fee_type === 'percentage' ? `${customer.fee_value}%` : `Rs. ${customer.fee_value}`}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={() => toggleExpand(customer.id)}>
                    {expandedCustomer === customer.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(customer.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {expandedCustomer === customer.id && customerAccounts[customer.id]?.length > 0 && (
                <div className="mt-4 pt-4 border-t space-y-2">
                  <p className="text-sm font-medium">Bank Accounts:</p>
                  {customerAccounts[customer.id].map((acc) => (
                    <div key={acc.id} className="text-sm pl-4 border-l-2 border-gray-200">
                      <p className="font-medium">{acc.account_title}</p>
                      <p className="text-muted-foreground">{acc.bank_name} - {acc.account_number}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {filteredCustomers.length === 0 && (
          <Card><CardContent className="py-8 text-center text-muted-foreground">
            {searchQuery ? 'No customers found matching your search.' : 'No customers yet. Click "Add Customer" to create one.'}
          </CardContent></Card>
        )}
      </div>
    </div>
  );
}
