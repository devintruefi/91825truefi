-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "plaid_account_id" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "subtype" VARCHAR(50),
    "mask" VARCHAR(4),
    "institution_name" VARCHAR(255),
    "balance" DECIMAL(18,2),
    "currency" VARCHAR(3),
    "is_active" BOOLEAN,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),
    "plaid_connection_id" UUID,
    "plaid_item_id" TEXT,
    "plaid_type" TEXT,
    "plaid_subtype" TEXT,
    "available_balance" DECIMAL,
    "limit_amount" DECIMAL,
    "institution_id" UUID,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_run_log" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "agent_name" VARCHAR(100) NOT NULL,
    "input_data" JSON,
    "output_data" JSON,
    "sql_queries" JSON,
    "api_calls" JSON,
    "error_message" TEXT,
    "execution_time_ms" DECIMAL(10,2),
    "timestamp" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_run_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_categories" (
    "id" UUID NOT NULL,
    "budget_id" UUID NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "budget_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(18,2) NOT NULL,
    "period" VARCHAR(20),
    "start_date" TIMESTAMPTZ(6) NOT NULL,
    "end_date" TIMESTAMPTZ(6),
    "is_active" BOOLEAN,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_ownership_details" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "manual_asset_id" UUID NOT NULL,
    "business_name" TEXT,
    "ownership_percentage" DECIMAL,
    "valuation" DECIMAL,
    "annual_income" DECIMAL,
    "acquisition_date" DATE,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_ownership_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_history" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "session_id" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "intent" VARCHAR(100),
    "confidence" DECIMAL(3,2),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "message_type" VARCHAR(20) NOT NULL,
    "content" TEXT NOT NULL,
    "rich_content" JSONB,
    "turn_number" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "session_id" VARCHAR(255) NOT NULL,
    "title" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collectible_details" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "manual_asset_id" UUID NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "acquisition_date" DATE,
    "acquisition_cost" DECIMAL,
    "estimated_value" DECIMAL,
    "appraisal_date" DATE,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collectible_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contribution_schedule" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "account_id" UUID,
    "user_id" UUID,
    "monthly_amount" DECIMAL(12,2),
    "employer_match" DECIMAL(5,2),

    CONSTRAINT "contribution_schedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estate_docs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "file_path" VARCHAR(500),
    "created_date" TIMESTAMPTZ(6),
    "last_updated" TIMESTAMPTZ(6),
    "is_active" BOOLEAN,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "estate_docs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_insights" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "insight_type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "severity" VARCHAR(20) NOT NULL,
    "data" JSONB,
    "is_read" BOOLEAN NOT NULL,
    "expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "financial_insights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "target_amount" DECIMAL(18,2) NOT NULL,
    "current_amount" DECIMAL(18,2),
    "target_date" TIMESTAMPTZ(6),
    "priority" VARCHAR(20),
    "is_active" BOOLEAN,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holdings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "account_id" UUID,
    "security_id" UUID,
    "quantity" DECIMAL(20,6),
    "cost_basis" DECIMAL(18,2),
    "institution_price" DECIMAL(18,6),
    "institution_value" DECIMAL(18,2),
    "last_price_date" DATE,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "holdings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "institutions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "plaid_institution_id" TEXT,
    "name" TEXT NOT NULL,
    "country_code" CHAR(2) DEFAULT 'US',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "institutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurances" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "provider" VARCHAR(255) NOT NULL,
    "policy_number" VARCHAR(255),
    "premium_amount" DECIMAL(18,2),
    "coverage_amount" DECIMAL(18,2),
    "start_date" TIMESTAMPTZ(6),
    "end_date" TIMESTAMPTZ(6),
    "is_active" BOOLEAN,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "insurances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_details" (
    "account_id" UUID NOT NULL,
    "interest_rate" DECIMAL(6,3),
    "origination_principal" DECIMAL(18,2),
    "origination_date" DATE,
    "maturity_date" DATE,
    "next_payment_due" DATE,
    "next_payment_amount" DECIMAL(18,2),
    "last_payment_date" DATE,
    "last_payment_amount" DECIMAL(18,2),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loan_details_pkey" PRIMARY KEY ("account_id")
);

-- CreateTable
CREATE TABLE "manual_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "name" TEXT NOT NULL,
    "asset_class" TEXT,
    "value" DECIMAL(18,2),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manual_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manual_liabilities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "name" TEXT NOT NULL,
    "liability_class" TEXT,
    "balance" DECIMAL(18,2),
    "interest_rate" DECIMAL(6,3),
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manual_liabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "other_manual_asset_details" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "manual_asset_id" UUID NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "acquisition_date" DATE,
    "acquisition_cost" DECIMAL,
    "estimated_value" DECIMAL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "other_manual_asset_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "other_manual_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "manual_asset_id" UUID NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "acquisition_cost" DECIMAL,
    "estimated_value" DECIMAL,
    "acquisition_date" DATE,
    "valuation_date" DATE,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "other_manual_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plaid_account_taxonomy" (
    "type" TEXT NOT NULL,
    "subtype" TEXT NOT NULL,

    CONSTRAINT "plaid_account_taxonomy_pkey" PRIMARY KEY ("type","subtype")
);

-- CreateTable
CREATE TABLE "plaid_connections" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "plaid_access_token" VARCHAR(255) NOT NULL,
    "plaid_item_id" VARCHAR(255) NOT NULL,
    "plaid_institution_id_text" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "last_sync_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "institution_id" UUID,
    "institution_name" TEXT,

    CONSTRAINT "plaid_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "real_estate_details" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "manual_asset_id" UUID NOT NULL,
    "address" TEXT,
    "property_type" TEXT,
    "is_primary_residence" BOOLEAN DEFAULT false,
    "purchase_price" DECIMAL,
    "purchase_date" DATE,
    "market_value" DECIMAL,
    "valuation_date" DATE,
    "appreciation_rate" DECIMAL,
    "property_tax_rate" DECIMAL,
    "annual_maintenance" DECIMAL,
    "mortgage_account_id" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "gross_monthly_rent" DECIMAL,
    "other_income_annual" DECIMAL,
    "vacancy_pct" DECIMAL,
    "property_mgmt_pct" DECIMAL,
    "insurance_annual" DECIMAL,
    "hoa_annual" DECIMAL,
    "utilities_owner_annual" DECIMAL,
    "capex_reserve_pct" DECIMAL,

    CONSTRAINT "real_estate_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recurring_income" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "source" TEXT,
    "gross_monthly" DECIMAL(12,2),
    "next_pay_date" DATE,
    "inflation_adj" BOOLEAN DEFAULT true,

    CONSTRAINT "recurring_income_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "securities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT,
    "ticker" TEXT,
    "security_type" TEXT,
    "cusip" TEXT,
    "isin" TEXT,
    "currency" CHAR(3) DEFAULT 'USD',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "securities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_profile" (
    "user_id" UUID NOT NULL,
    "filing_status" TEXT,
    "state" CHAR(2),
    "federal_rate" DECIMAL(4,2),
    "state_rate" DECIMAL(4,2),

    CONSTRAINT "tax_profile_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "plaid_transaction_id" VARCHAR(255) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency_code" VARCHAR(3) NOT NULL,
    "date" TIMESTAMPTZ(6) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "merchant_name" VARCHAR(255),
    "category" VARCHAR(100),
    "category_id" VARCHAR(50),
    "pending" BOOLEAN NOT NULL,
    "payment_channel" VARCHAR(50),
    "transaction_type" VARCHAR(50),
    "location" JSONB,
    "payment_meta" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "pfc_primary" TEXT,
    "pfc_detailed" TEXT,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_identity" (
    "user_id" UUID NOT NULL,
    "full_name" TEXT,
    "phone_primary" TEXT,
    "email_primary" TEXT,
    "street" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postal_code" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_identity_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "user_preferences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "theme" VARCHAR(20) NOT NULL,
    "notifications_enabled" BOOLEAN NOT NULL,
    "email_notifications" BOOLEAN NOT NULL,
    "push_notifications" BOOLEAN NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "timezone" VARCHAR(50) NOT NULL,
    "language" VARCHAR(10) NOT NULL,
    "financial_goals" JSONB,
    "risk_tolerance" VARCHAR(20),
    "investment_horizon" VARCHAR(20),
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL,
    "is_advisor" BOOLEAN NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_onboarding_responses" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_onboarding_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_progress" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "current_step" TEXT NOT NULL,
    "is_complete" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onboarding_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "manual_asset_id" UUID NOT NULL,
    "make" TEXT,
    "model" TEXT,
    "year" INTEGER,
    "vin" TEXT,
    "purchase_price" DECIMAL,
    "purchase_date" DATE,
    "mileage" INTEGER,
    "estimated_value" DECIMAL,
    "valuation_date" DATE,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_details" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "manual_asset_id" UUID NOT NULL,
    "vin" TEXT,
    "make" TEXT,
    "model" TEXT,
    "year" INTEGER,
    "mileage" DECIMAL,
    "purchase_price" DECIMAL,
    "purchase_date" DATE,
    "estimated_value" DECIMAL,
    "loan_account_id" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_details_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ix_accounts_plaid_account_id" ON "accounts"("plaid_account_id");

-- CreateIndex
CREATE INDEX "idx_accounts_plaid_id" ON "accounts"("plaid_account_id");

-- CreateIndex
CREATE INDEX "idx_accounts_user_id" ON "accounts"("user_id");

-- CreateIndex
CREATE INDEX "idx_agent_run_log_agent_name" ON "agent_run_log"("agent_name");

-- CreateIndex
CREATE INDEX "idx_agent_run_log_timestamp" ON "agent_run_log"("timestamp");

-- CreateIndex
CREATE INDEX "idx_agent_run_log_user_id" ON "agent_run_log"("user_id");

-- CreateIndex
CREATE INDEX "idx_budget_categories_budget_id" ON "budget_categories"("budget_id");

-- CreateIndex
CREATE INDEX "idx_budget_categories_category" ON "budget_categories"("category");

-- CreateIndex
CREATE INDEX "idx_budgets_user_id" ON "budgets"("user_id");

-- CreateIndex
CREATE INDEX "idx_chat_history_created_at" ON "chat_history"("created_at");

-- CreateIndex
CREATE INDEX "idx_chat_history_session_id" ON "chat_history"("session_id");

-- CreateIndex
CREATE INDEX "idx_chat_history_user_id" ON "chat_history"("user_id");

-- CreateIndex
CREATE INDEX "ix_chat_history_session_id" ON "chat_history"("session_id");

-- CreateIndex
CREATE INDEX "idx_chat_messages_created_at" ON "chat_messages"("created_at");

-- CreateIndex
CREATE INDEX "idx_chat_messages_session_id" ON "chat_messages"("session_id");

-- CreateIndex
CREATE INDEX "idx_chat_messages_turn" ON "chat_messages"("turn_number");

-- CreateIndex
CREATE INDEX "idx_chat_messages_type" ON "chat_messages"("message_type");

-- CreateIndex
CREATE INDEX "idx_chat_sessions_created_at" ON "chat_sessions"("created_at");

-- CreateIndex
CREATE INDEX "idx_chat_sessions_session_id" ON "chat_sessions"("session_id");

-- CreateIndex
CREATE INDEX "idx_chat_sessions_user_id" ON "chat_sessions"("user_id");

-- CreateIndex
CREATE INDEX "ix_chat_sessions_session_id" ON "chat_sessions"("session_id");

-- CreateIndex
CREATE INDEX "idx_estate_docs_type" ON "estate_docs"("type");

-- CreateIndex
CREATE INDEX "idx_estate_docs_user_id" ON "estate_docs"("user_id");

-- CreateIndex
CREATE INDEX "idx_financial_insights_created_at" ON "financial_insights"("created_at");

-- CreateIndex
CREATE INDEX "idx_financial_insights_severity" ON "financial_insights"("severity");

-- CreateIndex
CREATE INDEX "idx_financial_insights_type" ON "financial_insights"("insight_type");

-- CreateIndex
CREATE INDEX "idx_financial_insights_unread" ON "financial_insights"("is_read");

-- CreateIndex
CREATE INDEX "idx_financial_insights_user_id" ON "financial_insights"("user_id");

-- CreateIndex
CREATE INDEX "idx_goals_user_id" ON "goals"("user_id");

-- CreateIndex
CREATE INDEX "idx_holdings_account" ON "holdings"("account_id");

-- CreateIndex
CREATE INDEX "idx_holdings_security" ON "holdings"("security_id");

-- CreateIndex
CREATE UNIQUE INDEX "institutions_plaid_institution_id_key" ON "institutions"("plaid_institution_id");

-- CreateIndex
CREATE INDEX "idx_institutions_name" ON "institutions"("name");

-- CreateIndex
CREATE INDEX "idx_institutions_plaid_id" ON "institutions"("plaid_institution_id");

-- CreateIndex
CREATE INDEX "idx_insurances_type" ON "insurances"("type");

-- CreateIndex
CREATE INDEX "idx_insurances_user_id" ON "insurances"("user_id");

-- CreateIndex
CREATE INDEX "idx_manual_assets_user" ON "manual_assets"("user_id");

-- CreateIndex
CREATE INDEX "idx_manual_liabilities_user" ON "manual_liabilities"("user_id");

-- CreateIndex
CREATE INDEX "idx_plaid_connections_institution" ON "plaid_connections"("plaid_institution_id_text");

-- CreateIndex
CREATE INDEX "idx_plaid_connections_item_id" ON "plaid_connections"("plaid_item_id");

-- CreateIndex
CREATE INDEX "idx_plaid_connections_user_id" ON "plaid_connections"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_plaid_transaction_id_key" ON "transactions"("plaid_transaction_id");

-- CreateIndex
CREATE INDEX "idx_transactions_account_id" ON "transactions"("account_id");

-- CreateIndex
CREATE INDEX "idx_transactions_amount" ON "transactions"("amount");

-- CreateIndex
CREATE INDEX "idx_transactions_category" ON "transactions"("category");

-- CreateIndex
CREATE INDEX "idx_transactions_date" ON "transactions"("date");

-- CreateIndex
CREATE INDEX "idx_transactions_pfc_detailed" ON "transactions"("pfc_detailed");

-- CreateIndex
CREATE INDEX "idx_transactions_pfc_primary" ON "transactions"("pfc_primary");

-- CreateIndex
CREATE INDEX "idx_transactions_plaid_id" ON "transactions"("plaid_transaction_id");

-- CreateIndex
CREATE INDEX "idx_transactions_user_id" ON "transactions"("user_id");

-- CreateIndex
CREATE INDEX "idx_txn_user_date" ON "transactions"("user_id", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "user_preferences_user_id_key" ON "user_preferences"("user_id");

-- CreateIndex
CREATE INDEX "idx_user_preferences_user_id" ON "user_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ix_users_email" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_created_at" ON "users"("created_at");

-- CreateIndex
CREATE INDEX "idx_users_email" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_user_onboarding_responses_user_id" ON "user_onboarding_responses"("user_id");

-- CreateIndex
CREATE INDEX "idx_user_onboarding_responses_question" ON "user_onboarding_responses"("question");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_progress_user_id_key" ON "onboarding_progress"("user_id");

-- CreateIndex
CREATE INDEX "idx_onboarding_progress_user_id" ON "onboarding_progress"("user_id");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "agent_run_log" ADD CONSTRAINT "agent_run_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "budget_categories" ADD CONSTRAINT "budget_categories_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "business_ownership_details" ADD CONSTRAINT "business_ownership_details_manual_asset_id_fkey" FOREIGN KEY ("manual_asset_id") REFERENCES "manual_assets"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "chat_history" ADD CONSTRAINT "chat_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "collectible_details" ADD CONSTRAINT "collectible_details_manual_asset_id_fkey" FOREIGN KEY ("manual_asset_id") REFERENCES "manual_assets"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "contribution_schedule" ADD CONSTRAINT "contribution_schedule_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "estate_docs" ADD CONSTRAINT "estate_docs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "financial_insights" ADD CONSTRAINT "financial_insights_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "holdings" ADD CONSTRAINT "holdings_security_id_fkey" FOREIGN KEY ("security_id") REFERENCES "securities"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "insurances" ADD CONSTRAINT "insurances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "manual_assets" ADD CONSTRAINT "manual_assets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "manual_liabilities" ADD CONSTRAINT "manual_liabilities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "other_manual_asset_details" ADD CONSTRAINT "other_manual_asset_details_manual_asset_id_fkey" FOREIGN KEY ("manual_asset_id") REFERENCES "manual_assets"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "other_manual_assets" ADD CONSTRAINT "other_manual_assets_manual_asset_id_fkey" FOREIGN KEY ("manual_asset_id") REFERENCES "manual_assets"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "plaid_connections" ADD CONSTRAINT "fk_plaid_connections_institution" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "plaid_connections" ADD CONSTRAINT "plaid_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "real_estate_details" ADD CONSTRAINT "real_estate_details_manual_asset_id_fkey" FOREIGN KEY ("manual_asset_id") REFERENCES "manual_assets"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "recurring_income" ADD CONSTRAINT "recurring_income_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "tax_profile" ADD CONSTRAINT "tax_profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_identity" ADD CONSTRAINT "user_identity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_onboarding_responses" ADD CONSTRAINT "user_onboarding_responses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "onboarding_progress" ADD CONSTRAINT "onboarding_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vehicle_assets" ADD CONSTRAINT "vehicle_assets_manual_asset_id_fkey" FOREIGN KEY ("manual_asset_id") REFERENCES "manual_assets"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vehicle_details" ADD CONSTRAINT "vehicle_details_manual_asset_id_fkey" FOREIGN KEY ("manual_asset_id") REFERENCES "manual_assets"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
