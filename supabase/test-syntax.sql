-- SQL SYNTAX VALIDATION TEST
-- Run this first to test if the syntax is correct

-- Test basic table creation syntax
CREATE TABLE IF NOT EXISTS test_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Test foreign key syntax
CREATE TABLE IF NOT EXISTS test_child (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES test_table(id) ON DELETE CASCADE,
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Test RLS syntax
ALTER TABLE test_table ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_child ENABLE ROW LEVEL SECURITY;

-- Test policy syntax
CREATE POLICY "Test policy" ON test_table FOR SELECT USING (true);
CREATE POLICY "Test child policy" ON test_child FOR SELECT USING (true);

-- Test function syntax
CREATE OR REPLACE FUNCTION test_function()
RETURNS TRIGGER AS $$
BEGIN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Test trigger syntax
CREATE TRIGGER test_trigger
    AFTER INSERT ON test_table
    FOR EACH ROW
    EXECUTE FUNCTION test_function();

-- Clean up test objects
DROP TRIGGER IF EXISTS test_trigger ON test_table;
DROP FUNCTION IF EXISTS test_function();
DROP POLICY IF EXISTS "Test policy" ON test_table;
DROP POLICY IF EXISTS "Test child policy" ON test_child;
DROP TABLE IF EXISTS test_child;
DROP TABLE IF EXISTS test_table;

-- If this runs without errors, the main database schema should work
