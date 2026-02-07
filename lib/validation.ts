import { z } from 'zod';

// Transaction validation schemas
export const transactionSchema = z.object({
  type: z.enum([
    'cash_in',
    'cash_out', 
    'cash_in_physical',
    'cash_out_physical',
    'cash_in_personal',
    'cash_out_personal',
    'account_transfer',
    'loan_given',
    'loan_received',
    'expense',
    'income'
  ]),
  subcategory: z.enum(['physical', 'digital']).optional(),
  from_account_id: z.string().uuid().optional(),
  to_account_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  customer_account_id: z.string().uuid().optional(),
  amount: z.number().min(0.01, 'Amount must be greater than 0').max(999999999, 'Amount too large'),
  fee_amount: z.number().min(0, 'Fee must be non-negative').max(999999999, 'Fee too large'),
  description: z.string().max(500, 'Description too long').optional(),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
});

// Account validation schemas
export const accountSchema = z.object({
  name: z.string().min(1, 'Account name is required').max(100, 'Name too long'),
  type: z.enum(['cash', 'bank', 'wallet']),
  opening_balance: z.number().min(0, 'Opening balance must be non-negative').max(999999999, 'Amount too large'),
  account_number: z.string().max(50, 'Account number too long').optional(),
  provider: z.string().max(100, 'Provider name too long').optional(),
});

// Customer validation schemas
export const customerSchema = z.object({
  name: z.string().min(1, 'Customer name is required').max(100, 'Name too long'),
  phone: z.string().regex(/^\+?[0-9\s\-\(\)]+$/, 'Invalid phone number').max(20, 'Phone number too long').optional(),
  fee_type: z.enum(['percentage', 'fixed']),
  fee_value: z.number().min(0, 'Fee value must be non-negative').max(100, 'Percentage fee cannot exceed 100'),
});

// Customer account validation schemas
export const customerAccountSchema = z.object({
  account_title: z.string().min(1, 'Account title is required').max(100, 'Title too long'),
  account_number: z.string().min(1, 'Account number is required').max(50, 'Number too long'),
  bank_name: z.string().min(1, 'Bank name is required').max(100, 'Name too long'),
  type: z.enum(['bank', 'wallet']),
});

// Password validation schema
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

// Email validation schema
export const emailSchema = z.string().email('Invalid email address');

// User registration schema
export const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// User login schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

// Export types
export type TransactionInput = z.infer<typeof transactionSchema>;
export type AccountInput = z.infer<typeof accountSchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
export type CustomerAccountInput = z.infer<typeof customerAccountSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
