'use client';

import { useState } from 'react';
import { Transaction, TransactionDescription, TransactionAttachment } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X, Paperclip, FileText, Image, Download } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';

interface EnhancedReportsTableProps {
  transactions: Transaction[];
  onAddDescription?: (transactionId: string, description: string) => void;
  onAddAttachment?: (transactionId: string, file: File) => void;
}

export function EnhancedReportsTable({ 
  transactions, 
  onAddDescription, 
  onAddAttachment 
}: EnhancedReportsTableProps) {
  const [expandedTransactions, setExpandedTransactions] = useState<Set<string>>(new Set());
  const [newDescriptions, setNewDescriptions] = useState<Record<string, string>>({});

  // Add sequence numbers to transactions
  const transactionsWithSequence = transactions.map((tx, index) => ({
    ...tx,
    sequence_number: index + 1,
  }));

  const toggleTransactionExpansion = (transactionId: string) => {
    const newExpanded = new Set(expandedTransactions);
    if (newExpanded.has(transactionId)) {
      newExpanded.delete(transactionId);
    } else {
      newExpanded.add(transactionId);
    }
    setExpandedTransactions(newExpanded);
  };

  const handleAddDescription = (transactionId: string) => {
    const description = newDescriptions[transactionId]?.trim();
    if (description && onAddDescription) {
      onAddDescription(transactionId, description);
      setNewDescriptions(prev => ({ ...prev, [transactionId]: '' }));
    }
  };

  const handleFileUpload = (transactionId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onAddAttachment) {
      onAddAttachment(transactionId, file);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (fileType === 'application/pdf') return <FileText className="h-4 w-4" />;
    return <Paperclip className="h-4 w-4" />;
  };

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
        <CardTitle>Transaction Reports</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Fee</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Attachments</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactionsWithSequence.map((transaction) => (
                <>
                  <TableRow key={transaction.id} className="cursor-pointer hover:bg-gray-50">
                    <TableCell className="font-medium">{transaction.sequence_number}</TableCell>
                    <TableCell>{format(new Date(transaction.transaction_date), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                      <Badge className={`capitalize ${getTransactionTypeColor(transaction.type)}`}>
                        {transaction.type.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{transaction.customer?.name || '-'}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(transaction.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {transaction.fee_amount > 0 ? formatCurrency(transaction.fee_amount) : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate">
                        {transaction.description || '-'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {transaction.attachments && transaction.attachments.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Paperclip className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {transaction.attachments.length}
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleTransactionExpansion(transaction.id)}
                      >
                        {expandedTransactions.has(transaction.id) ? '−' : '+'}
                      </Button>
                    </TableCell>
                  </TableRow>
                  
                  {expandedTransactions.has(transaction.id) && (
                    <TableRow>
                      <TableCell colSpan={9} className="bg-gray-50 p-4">
                        <div className="space-y-4">
                          {/* Multiple Descriptions Section */}
                          <div>
                            <Label className="text-sm font-medium mb-2 block">Descriptions</Label>
                            <div className="space-y-2 mb-3">
                              {transaction.descriptions?.map((desc, index) => (
                                <div key={desc.id} className="flex items-start gap-2 p-2 bg-white rounded border">
                                  <span className="text-sm text-muted-foreground font-medium w-6">
                                    {index + 1}.
                                  </span>
                                  <span className="text-sm flex-1">{desc.description}</span>
                                </div>
                              ))}
                            </div>
                            
                            {/* Add new description */}
                            <div className="flex gap-2">
                              <Input
                                placeholder="Add new description..."
                                value={newDescriptions[transaction.id] || ''}
                                onChange={(e) => setNewDescriptions(prev => ({
                                  ...prev,
                                  [transaction.id]: e.target.value
                                }))}
                                className="flex-1"
                              />
                              <Button
                                size="sm"
                                onClick={() => handleAddDescription(transaction.id)}
                                disabled={!newDescriptions[transaction.id]?.trim()}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Attachments Section */}
                          <div>
                            <Label className="text-sm font-medium mb-2 block">Attachments (Max 3 files)</Label>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mb-3">
                              {transaction.attachments?.map((attachment) => (
                                <div key={attachment.id} className="flex items-center gap-2 p-2 bg-white rounded border">
                                  {getFileIcon(attachment.file_type)}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm truncate">{attachment.file_name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {(attachment.file_size / 1024).toFixed(1)} KB
                                    </p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => window.open(attachment.file_url, '_blank')}
                                  >
                                    <Download className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                            
                            {/* Add new attachment */}
                            {(transaction.attachments?.length || 0) < 3 && (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                  onChange={(e) => handleFileUpload(transaction.id, e)}
                                  className="flex-1"
                                />
                                <Label htmlFor={`file-${transaction.id}`} className="cursor-pointer">
                                  <Button size="sm" asChild>
                                    <span>
                                      <Paperclip className="h-4 w-4 mr-1" />
                                      Attach
                                    </span>
                                  </Button>
                                </Label>
                              </div>
                            )}
                            
                            {(transaction.attachments?.length || 0) >= 3 && (
                              <p className="text-sm text-muted-foreground">
                                Maximum 3 files allowed
                              </p>
                            )}
                          </div>

                          {/* Additional Details */}
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="font-medium">From Account:</span>
                              <p className="text-muted-foreground">
                                {transaction.from_account?.name || '-'}
                              </p>
                            </div>
                            <div>
                              <span className="font-medium">To Account:</span>
                              <p className="text-muted-foreground">
                                {transaction.to_account?.name || '-'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
