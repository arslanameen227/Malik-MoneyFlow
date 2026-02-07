-- Constraint to limit attachments per transaction (max 3)
-- Run this after the enhanced-schema.sql and after some data exists

-- This constraint uses a subquery which can be expensive, so it's optional
-- Uncomment if you want to enforce the 3-file limit at database level

/*
ALTER TABLE transaction_attachments 
ADD CONSTRAINT chk_max_attachments 
CHECK (
    (SELECT COUNT(*) FROM transaction_attachments ta WHERE ta.transaction_id = transaction_attachments.transaction_id) <= 3
);
*/

-- Alternative approach: Use a trigger to check the count
CREATE OR REPLACE FUNCTION check_attachment_count()
RETURNS TRIGGER AS $$
DECLARE
    attachment_count INTEGER;
BEGIN
    -- Count existing attachments for this transaction
    SELECT COUNT(*) INTO attachment_count
    FROM transaction_attachments 
    WHERE transaction_id = NEW.transaction_id;
    
    -- Check if adding this would exceed 3
    IF attachment_count >= 3 THEN
        RAISE EXCEPTION 'Maximum 3 attachments allowed per transaction';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for attachment count validation
DROP TRIGGER IF EXISTS check_attachment_count_trigger ON transaction_attachments;
CREATE TRIGGER check_attachment_count_trigger
    BEFORE INSERT ON transaction_attachments
    FOR EACH ROW
    EXECUTE FUNCTION check_attachment_count();
