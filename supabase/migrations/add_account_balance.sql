-- Add balance tracking to accounts
-- This migration adds account balance calculation functionality

-- Add balance field (optional, can be calculated dynamically)
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS balance DECIMAL(10, 2) DEFAULT 0;

-- Create function to calculate account balance from transactions
CREATE OR REPLACE FUNCTION calculate_account_balance(account_uuid UUID)
RETURNS DECIMAL(10, 2)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  total DECIMAL(10, 2);
BEGIN
  SELECT COALESCE(SUM(amount), 0)
  INTO total
  FROM transactions
  WHERE account_id = account_uuid;
  
  RETURN total;
END;
$$;

-- Create function to update account balance on transaction changes
CREATE OR REPLACE FUNCTION update_account_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update balance for the affected account
  IF TG_OP = 'DELETE' THEN
    UPDATE accounts
    SET balance = (SELECT calculate_account_balance(OLD.account_id))
    WHERE id = OLD.account_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Update both old and new accounts if account_id changed
    UPDATE accounts
    SET balance = (SELECT calculate_account_balance(OLD.account_id))
    WHERE id = OLD.account_id;
    
    IF NEW.account_id != OLD.account_id THEN
      UPDATE accounts
      SET balance = (SELECT calculate_account_balance(NEW.account_id))
      WHERE id = NEW.account_id;
    END IF;
    RETURN NEW;
  ELSE -- INSERT
    UPDATE accounts
    SET balance = (SELECT calculate_account_balance(NEW.account_id))
    WHERE id = NEW.account_id;
    RETURN NEW;
  END IF;
END;
$$;

-- Create trigger to auto-update balances
DROP TRIGGER IF EXISTS trigger_update_account_balance ON transactions;
CREATE TRIGGER trigger_update_account_balance
  AFTER INSERT OR UPDATE OR DELETE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_account_balance();

-- Initialize balances for existing accounts
UPDATE accounts
SET balance = (SELECT calculate_account_balance(id));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_transactions_account_date ON transactions(account_id, date DESC);

-- Add comment
COMMENT ON COLUMN accounts.balance IS 'Automatically calculated balance based on all transactions for this account';
