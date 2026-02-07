-- Additional database constraints and improvements
-- Run this after the main schema.sql

-- Add constraints to transactions table
ALTER TABLE transactions 
ADD CONSTRAINT chk_amount_positive CHECK (amount > 0),
ADD CONSTRAINT chk_fee_non_negative CHECK (fee_amount >= 0),
ADD CONSTRAINT chk_transaction_date_valid CHECK (transaction_date <= CURRENT_DATE + INTERVAL '1 day');

-- Add constraints to accounts table
ALTER TABLE accounts 
ADD CONSTRAINT chk_opening_balance_non_negative CHECK (opening_balance >= 0),
ADD CONSTRAINT chk_current_balance_non_negative CHECK (current_balance >= 0);

-- Add constraints to customers table
ALTER TABLE customers 
ADD CONSTRAINT chk_fee_value_non_negative CHECK (fee_value >= 0),
ADD CONSTRAINT chk_fee_value_range CHECK (
  (fee_type = 'percentage' AND fee_value <= 100) OR 
  (fee_type = 'fixed' AND fee_value <= 999999999)
);

-- Add constraints to cash_positions table
ALTER TABLE cash_positions 
ADD CONSTRAINT chk_opening_balance_non_negative CHECK (opening_balance >= 0),
ADD CONSTRAINT chk_closing_balance_non_negative CHECK (closing_balance >= 0),
ADD CONSTRAINT chk_cash_received_non_negative CHECK (total_cash_received >= 0),
ADD CONSTRAINT chk_cash_given_non_negative CHECK (total_cash_given >= 0);

-- Add unique constraint for customer accounts
ALTER TABLE customer_accounts 
ADD CONSTRAINT uk_customer_account_number UNIQUE (customer_id, account_number, bank_name);

-- Add composite indexes for better performance
CREATE INDEX idx_transactions_user_date_type ON transactions(user_id, transaction_date, type);
CREATE INDEX idx_transactions_customer_date ON transactions(customer_id, transaction_date) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_accounts_user_type_active ON accounts(user_id, type, is_active);
CREATE INDEX idx_customers_user_name ON customers(user_id, name);
CREATE INDEX idx_cash_positions_user_date_range ON cash_positions(user_id, date DESC);

-- Add function to validate sufficient funds
CREATE OR REPLACE FUNCTION check_sufficient_funds()
RETURNS TRIGGER AS $$
DECLARE
    account_balance DECIMAL(15, 2);
BEGIN
    -- Check for transactions that decrease account balance
    IF NEW.type IN ('cash_out', 'cash_out_physical', 'cash_out_personal', 'account_transfer', 'loan_given', 'expense') THEN
        -- Get the account balance that will be decreased
        IF NEW.type = 'account_transfer' THEN
            SELECT current_balance INTO account_balance 
            FROM accounts 
            WHERE id = NEW.from_account_id;
        ELSIF NEW.type = 'cash_out_personal' AND NEW.subcategory = 'digital' THEN
            SELECT current_balance INTO account_balance 
            FROM accounts 
            WHERE id = NEW.from_account_id;
        ELSIF NEW.type = 'cash_out' THEN
            SELECT current_balance INTO account_balance 
            FROM accounts 
            WHERE id = NEW.to_account_id;
        ELSIF NEW.type IN ('loan_given', 'expense') THEN
            SELECT current_balance INTO account_balance 
            FROM accounts 
            WHERE id = NEW.from_account_id;
        END IF;

        -- Check if sufficient funds are available
        IF account_balance < NEW.amount THEN
            RAISE EXCEPTION 'Insufficient funds in account. Available: %, Required: %', 
                account_balance, NEW.amount;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for fund validation
CREATE TRIGGER validate_funds_before_transaction
  BEFORE INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION check_sufficient_funds();

-- Add function to prevent duplicate customer accounts
CREATE OR REPLACE FUNCTION prevent_duplicate_customer_accounts()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM customer_accounts 
        WHERE customer_id = NEW.customer_id 
        AND account_number = NEW.account_number 
        AND bank_name = NEW.bank_name
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000')
    ) THEN
        RAISE EXCEPTION 'Customer account with this number and bank already exists';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for duplicate prevention
CREATE TRIGGER prevent_duplicate_customer_accounts_trigger
  BEFORE INSERT OR UPDATE ON customer_accounts
  FOR EACH ROW
  EXECUTE FUNCTION prevent_duplicate_customer_accounts();

-- Add audit columns for better tracking
ALTER TABLE accounts ADD COLUMN updated_by UUID REFERENCES auth.users(id);
ALTER TABLE customers ADD COLUMN updated_by UUID REFERENCES auth.users(id);
ALTER TABLE customer_accounts ADD COLUMN updated_by UUID REFERENCES auth.users(id);
ALTER TABLE transactions ADD COLUMN updated_by UUID REFERENCES auth.users(id);

-- Create function to automatically update updated_by column
CREATE OR REPLACE FUNCTION set_updated_by()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_by = auth.uid();
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_by
CREATE TRIGGER set_accounts_updated_by
  BEFORE UPDATE ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_by();

CREATE TRIGGER set_customers_updated_by
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_by();

CREATE TRIGGER set_customer_accounts_updated_by
  BEFORE UPDATE ON customer_accounts
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_by();

-- Add view for transaction summaries
CREATE OR REPLACE VIEW transaction_summary AS
SELECT 
    user_id,
    transaction_date,
    type,
    COUNT(*) as transaction_count,
    SUM(amount) as total_amount,
    SUM(fee_amount) as total_fees
FROM transactions
GROUP BY user_id, transaction_date, type
ORDER BY transaction_date DESC, type;

-- Add view for daily cash flow
CREATE OR REPLACE VIEW daily_cash_flow AS
SELECT 
    cp.user_id,
    cp.date,
    cp.opening_balance,
    cp.closing_balance,
    cp.total_cash_received,
    cp.total_cash_given,
    (cp.total_cash_received - cp.total_cash_given) as net_cash_flow,
    COALESCE(SUM(t.fee_amount), 0) as total_fees_earned
FROM cash_positions cp
LEFT JOIN transactions t ON cp.user_id = t.user_id AND cp.date = t.transaction_date
GROUP BY cp.user_id, cp.date, cp.opening_balance, cp.closing_balance, cp.total_cash_received, cp.total_cash_given
ORDER BY cp.date DESC;

-- Grant permissions to views
GRANT SELECT ON transaction_summary TO authenticated;
GRANT SELECT ON daily_cash_flow TO authenticated;
