-- Enhanced schema for transaction descriptions and attachments
-- Run this after the main schema.sql

-- Transaction Descriptions Table
CREATE TABLE IF NOT EXISTS transaction_descriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    sequence_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Transaction Attachments Table
CREATE TABLE IF NOT EXISTS transaction_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Storage bucket for transaction attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('transaction-attachments', 'transaction-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for transaction_descriptions
ALTER TABLE transaction_descriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transaction descriptions"
    ON transaction_descriptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transaction descriptions"
    ON transaction_descriptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transaction descriptions"
    ON transaction_descriptions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transaction descriptions"
    ON transaction_descriptions FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for transaction_attachments
ALTER TABLE transaction_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transaction attachments"
    ON transaction_attachments FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transaction attachments"
    ON transaction_attachments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transaction attachments"
    ON transaction_attachments FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transaction attachments"
    ON transaction_attachments FOR DELETE
    USING (auth.uid() = user_id);

-- Storage Policies for transaction-attachments bucket
CREATE POLICY "Users can upload their own transaction attachments"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'transaction-attachments' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view their own transaction attachments"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'transaction-attachments' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can update their own transaction attachments"
    ON storage.objects FOR UPDATE
    USING (
        bucket_id = 'transaction-attachments' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own transaction attachments"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'transaction-attachments' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

-- Indexes for better performance
CREATE INDEX idx_transaction_descriptions_transaction_id ON transaction_descriptions(transaction_id);
CREATE INDEX idx_transaction_descriptions_user_id ON transaction_descriptions(user_id);
CREATE INDEX idx_transaction_attachments_transaction_id ON transaction_attachments(transaction_id);
CREATE INDEX idx_transaction_attachments_user_id ON transaction_attachments(user_id);

-- Function to update sequence order for descriptions
CREATE OR REPLACE FUNCTION update_description_sequence()
RETURNS TRIGGER AS $$
BEGIN
    -- Update sequence order for all descriptions of this transaction
    UPDATE transaction_descriptions 
    SET sequence_order = row_number 
    OVER (ORDER BY created_at)
    WHERE transaction_id = NEW.transaction_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update sequence order
CREATE TRIGGER update_description_sequence_trigger
    AFTER INSERT ON transaction_descriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_description_sequence();

-- Function to validate file type and size
CREATE OR REPLACE FUNCTION validate_file_type()
RETURNS TRIGGER AS $$
BEGIN
    -- Allowed file types: PDF, Images, Documents
    IF NEW.file_type NOT IN (
        'application/pdf',
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/gif',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
    ) THEN
        RAISE EXCEPTION 'File type not allowed: %', NEW.file_type;
    END IF;
    
    -- Max file size: 10MB
    IF NEW.file_size > 10485760 THEN
        RAISE EXCEPTION 'File size too large. Maximum 10MB allowed.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for file validation
CREATE TRIGGER validate_file_type_trigger
    BEFORE INSERT ON transaction_attachments
    FOR EACH ROW
    EXECUTE FUNCTION validate_file_type();

-- Grant permissions
GRANT ALL ON transaction_descriptions TO authenticated;
GRANT ALL ON transaction_attachments TO authenticated;
GRANT ALL ON storage.objects TO authenticated;
