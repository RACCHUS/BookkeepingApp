-- Add transaction split tracking fields
-- Split transactions allow one original transaction to be divided into multiple
-- with different categories/descriptions while maintaining the link to the original

-- Add parent_transaction_id to track split relationships
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS parent_transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL;

-- Add is_split flag to mark transactions that have been split
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_split BOOLEAN DEFAULT FALSE;

-- Add split_index for ordering split parts (0 = original/remainder, 1+ = split portions)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS split_index INTEGER DEFAULT 0;

-- Add original_amount to preserve the original amount before splitting
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS original_amount DECIMAL(12, 2);

-- Index for efficient parent lookup
CREATE INDEX IF NOT EXISTS idx_transactions_parent_id ON transactions(parent_transaction_id);

-- Index for finding split transactions
CREATE INDEX IF NOT EXISTS idx_transactions_is_split ON transactions(is_split) WHERE is_split = TRUE;

-- Comment explaining the split logic
COMMENT ON COLUMN transactions.parent_transaction_id IS 'Links split portions back to the original transaction';
COMMENT ON COLUMN transactions.is_split IS 'True if this transaction has been split into multiple transactions';
COMMENT ON COLUMN transactions.split_index IS '0 for original/remainder, 1+ for split portions';
COMMENT ON COLUMN transactions.original_amount IS 'Preserves original amount before splitting';
