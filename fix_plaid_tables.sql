-- Check and add missing columns to plaid_connections if table exists
DO $$
BEGIN
    -- Check if plaid_connections table exists
    IF NOT EXISTS (SELECT FROM information_schema.tables
                   WHERE table_schema = 'public'
                   AND table_name = 'plaid_connections') THEN
        -- Create the table based on Prisma schema
        CREATE TABLE plaid_connections (
            id UUID PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            plaid_access_token VARCHAR(255) NOT NULL,
            plaid_item_id VARCHAR(255) UNIQUE NOT NULL,
            plaid_institution_id_text VARCHAR(255) NOT NULL,
            institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
            institution_name TEXT,
            is_active BOOLEAN NOT NULL,
            last_sync_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL,
            updated_at TIMESTAMPTZ NOT NULL
        );

        -- Create indexes
        CREATE INDEX idx_plaid_connections_user_id ON plaid_connections(user_id);
        CREATE INDEX idx_plaid_connections_item_id ON plaid_connections(plaid_item_id);
        CREATE INDEX idx_plaid_connections_institution ON plaid_connections(plaid_institution_id_text);

        RAISE NOTICE 'Created plaid_connections table';
    ELSE
        RAISE NOTICE 'plaid_connections table already exists';
    END IF;
END $$;