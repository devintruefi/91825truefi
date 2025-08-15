-- Migration for budget spending functionality
-- Run this in your PostgreSQL database

-- Add budget_spending table
CREATE TABLE IF NOT EXISTS budget_spending (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL,
    manual_amount DECIMAL(18,2) DEFAULT 0,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (category_id) REFERENCES budget_categories(id) ON DELETE CASCADE,
    UNIQUE(category_id, month, year)
);

-- Create indexes for budget_spending
CREATE INDEX IF NOT EXISTS idx_budget_spending_category_id ON budget_spending(category_id);
CREATE INDEX IF NOT EXISTS idx_budget_spending_month_year ON budget_spending(month, year);

-- Add auto-allocation fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS default_checking_buffer DECIMAL(18,2) DEFAULT 2000,
ADD COLUMN IF NOT EXISTS auto_allocation_enabled BOOLEAN DEFAULT true;