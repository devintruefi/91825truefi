# TrueFi Database Schema Report

Generated: 2025-09-20T20:10:12.012186

## Table: `accounts`

**Primary Keys:** id

### Columns

| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | uuid | NO |  |
| user_id | uuid | NO |  |
| plaid_account_id | character varying(255) | NO |  |
| name | character varying(255) | NO |  |
| type | character varying(50) | NO |  |
| subtype | character varying(50) | YES |  |
| mask | character varying(4) | YES |  |
| institution_name | character varying(255) | YES |  |
| balance | numeric | YES |  |
| currency | character varying(3) | YES |  |
| is_active | boolean | YES |  |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES |  |
| plaid_connection_id | uuid | YES |  |
| plaid_item_id | text | YES |  |
| available_balance | numeric | YES |  |
| limit_amount | numeric | YES |  |
| institution_id | uuid | YES |  |
| official_name | text | YES |  |
| persistent_account_id | text | YES |  |
| balances_last_updated | timestamp with time zone | YES |  |
| unofficial_currency_code | text | YES |  |

### Foreign Keys

| Column | References |
|--------|------------|
| institution_id | institutions.id |
| plaid_item_id | plaid_connections.plaid_item_id |
| user_id | users.id |
| plaid_connection_id | plaid_connections.id |

---

## Table: `budget_categories`

**Primary Keys:** id

### Columns

| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | uuid | NO |  |
| budget_id | uuid | NO |  |
| category | character varying(100) | NO |  |
| amount | numeric | NO |  |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES |  |

### Foreign Keys

| Column | References |
|--------|------------|
| budget_id | budgets.id |

---

## Table: `budget_spending`

**Primary Keys:** id

### Columns

| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | uuid | NO | gen_random_uuid() |
| category_id | uuid | NO |  |
| manual_amount | numeric | YES | 0 |
| month | smallint | NO |  |
| year | integer | NO |  |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

### Foreign Keys

| Column | References |
|--------|------------|
| category_id | budget_categories.id |

---

## Table: `budgets`

**Primary Keys:** id

### Columns

| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | uuid | NO |  |
| user_id | uuid | NO |  |
| name | character varying(255) | NO |  |
| description | text | YES |  |
| amount | numeric | NO |  |
| period | character varying(20) | YES |  |
| start_date | timestamp with time zone | NO |  |
| end_date | timestamp with time zone | YES |  |
| is_active | boolean | YES |  |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES |  |

### Foreign Keys

| Column | References |
|--------|------------|
| user_id | users.id |

---

## Table: `chat_messages`

**Primary Keys:** id

### Columns

| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | uuid | NO |  |
| session_id | uuid | NO |  |
| message_type | character varying(20) | NO |  |
| content | text | NO |  |
| rich_content | jsonb | YES |  |
| turn_number | integer | NO |  |
| created_at | timestamp with time zone | NO |  |
| user_id | uuid | NO |  |

### Foreign Keys

| Column | References |
|--------|------------|
| session_id | chat_sessions.id |
| user_id | users.id |

---

## Table: `chat_sessions`

**Primary Keys:** id

### Columns

| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | uuid | NO |  |
| user_id | uuid | NO |  |
| session_id | character varying(255) | NO |  |
| title | character varying(255) | YES |  |
| is_active | boolean | NO |  |
| created_at | timestamp with time zone | NO |  |
| updated_at | timestamp with time zone | NO |  |

### Foreign Keys

| Column | References |
|--------|------------|
| user_id | users.id |

---

## Table: `goals`

**Primary Keys:** id

### Columns

| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | uuid | NO |  |
| user_id | uuid | NO |  |
| name | character varying(255) | NO |  |
| description | text | YES |  |
| target_amount | numeric | NO |  |
| current_amount | numeric | YES |  |
| target_date | timestamp with time zone | YES |  |
| priority | character varying(20) | YES |  |
| is_active | boolean | YES |  |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES |  |
| allocation_method | character varying(20) | YES | 'auto'::character varying |
| checking_buffer_amount | numeric | YES | 2000.00 |
| allocation_percentage | numeric | YES |  |
| allocation_priority | integer | YES | 5 |
| auto_calculated_amount | numeric | YES |  |
| last_auto_calculation | timestamp with time zone | YES |  |

### Foreign Keys

| Column | References |
|--------|------------|
| user_id | users.id |

---

## Table: `holdings`

**Primary Keys:** id

### Columns

| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | uuid | NO | gen_random_uuid() |
| account_id | uuid | YES |  |
| security_id | uuid | YES |  |
| quantity | numeric | YES |  |
| cost_basis | numeric | YES |  |
| institution_price | numeric | YES |  |
| institution_value | numeric | YES |  |
| last_price_date | date | YES |  |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| institution_price_as_of | date | YES |  |
| institution_price_datetime | timestamp with time zone | YES |  |
| position_iso_currency_code | character varying(3) | YES |  |
| position_unofficial_currency_code | text | YES |  |
| vested_quantity | numeric | YES |  |
| vested_value | numeric | YES |  |

### Foreign Keys

| Column | References |
|--------|------------|
| account_id | accounts.id |
| security_id | securities.id |

---

## Table: `holdings_current`

**Primary Keys:** id

### Columns

| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | uuid | NO | gen_random_uuid() |
| account_id | uuid | NO |  |
| security_id | uuid | NO |  |
| quantity | numeric | NO |  |
| cost_basis_total | numeric | YES |  |
| market_value | numeric | YES |  |
| as_of_date | date | NO |  |

### Foreign Keys

| Column | References |
|--------|------------|
| account_id | accounts.id |
| security_id | securities.id |

---

## Table: `manual_assets`

**Primary Keys:** id

### Columns

| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | YES |  |
| name | text | NO |  |
| asset_class | text | YES |  |
| value | numeric | YES |  |
| notes | text | YES |  |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

### Foreign Keys

| Column | References |
|--------|------------|
| user_id | users.id |

---

## Table: `manual_liabilities`

**Primary Keys:** id

### Columns

| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | YES |  |
| name | text | NO |  |
| liability_class | text | YES |  |
| balance | numeric | YES |  |
| interest_rate | numeric | YES |  |
| notes | text | YES |  |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

### Foreign Keys

| Column | References |
|--------|------------|
| user_id | users.id |

---

## Table: `plaid_connections`

**Primary Keys:** id

### Columns

| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | uuid | NO |  |
| user_id | uuid | NO |  |
| plaid_access_token | character varying(255) | NO |  |
| plaid_item_id | character varying(255) | NO |  |
| plaid_institution_id_text | character varying(255) | NO |  |
| is_active | boolean | NO |  |
| last_sync_at | timestamp with time zone | YES |  |
| created_at | timestamp with time zone | NO |  |
| updated_at | timestamp with time zone | NO |  |
| institution_id | uuid | YES |  |
| institution_name | text | YES |  |

### Foreign Keys

| Column | References |
|--------|------------|
| institution_id | institutions.id |
| user_id | users.id |

---

## Table: `recurring_income`

**Primary Keys:** id

### Columns

| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | YES |  |
| source | text | YES |  |
| gross_monthly | numeric | YES |  |
| next_pay_date | date | YES |  |
| inflation_adj | boolean | YES | true |
| frequency | text | YES |  |
| net_monthly | numeric | YES |  |
| employer | text | YES |  |
| effective_from | date | YES |  |
| effective_to | date | YES |  |
| is_net | boolean | NO | false |
| metadata | jsonb | YES | '{}'::jsonb |

### Foreign Keys

| Column | References |
|--------|------------|
| user_id | users.id |

---

## Table: `securities`

**Primary Keys:** id

### Columns

| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | uuid | NO | gen_random_uuid() |
| name | text | YES |  |
| ticker | text | YES |  |
| security_type | text | YES |  |
| cusip | text | YES |  |
| isin | text | YES |  |
| currency | character(3) | YES | 'USD'::bpchar |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| is_cash_equivalent | boolean | YES |  |
| institution_security_id | text | YES |  |
| institution_id | text | YES |  |
| proxy_security_id | text | YES |  |
| sedol | text | YES |  |
| plaid_security_id | text | YES |  |

---

## Table: `tax_profile`

**Primary Keys:** user_id

### Columns

| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| user_id | uuid | NO |  |
| filing_status | text | YES |  |
| state | character(2) | YES |  |
| federal_rate | numeric | YES |  |
| state_rate | numeric | YES |  |

### Foreign Keys

| Column | References |
|--------|------------|
| user_id | users.id |

---

## Table: `transactions`

**Primary Keys:** id

### Columns

| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | uuid | NO |  |
| user_id | uuid | NO |  |
| account_id | uuid | NO |  |
| plaid_transaction_id | character varying(255) | NO |  |
| amount | numeric | NO |  |
| currency_code | character varying(3) | NO |  |
| date | timestamp with time zone | NO |  |
| name | character varying(255) | NO |  |
| merchant_name | character varying(255) | YES |  |
| category | character varying(100) | YES |  |
| category_id | character varying(50) | YES |  |
| pending | boolean | NO |  |
| payment_channel | character varying(50) | YES |  |
| transaction_type | character varying(50) | YES |  |
| location | jsonb | YES |  |
| payment_meta | jsonb | YES |  |
| created_at | timestamp with time zone | NO |  |
| pfc_primary | text | YES |  |
| pfc_detailed | text | YES |  |
| category_uuid | uuid | YES |  |
| authorized_date | date | YES |  |
| authorized_datetime | timestamp with time zone | YES |  |
| posted_datetime | timestamp with time zone | YES |  |
| pending_transaction_id | character varying(255) | YES |  |
| merchant_entity_id | text | YES |  |
| pfc_confidence_level | text | YES |  |
| transaction_code | text | YES |  |
| account_owner | text | YES |  |
| unofficial_currency_code | text | YES |  |

### Foreign Keys

| Column | References |
|--------|------------|
| account_id | accounts.id |
| category_uuid | transaction_categories.id |
| user_id | users.id |

---

## Table: `user_demographics`

**Primary Keys:** user_id

### Columns

| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| user_id | uuid | NO |  |
| age | integer | YES |  |
| household_income | numeric | YES |  |
| marital_status | character varying(50) | YES |  |
| dependents | integer | YES |  |
| life_stage | character varying(50) | YES |  |
| created_at | timestamp with time zone | NO | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | NO | CURRENT_TIMESTAMP |

### Foreign Keys

| Column | References |
|--------|------------|
| user_id | users.id |

---

## Table: `user_identity`

**Primary Keys:** user_id

### Columns

| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| user_id | uuid | NO |  |
| full_name | text | YES |  |
| phone_primary | text | YES |  |
| email_primary | text | YES |  |
| street | text | YES |  |
| city | text | YES |  |
| state | text | YES |  |
| postal_code | text | YES |  |
| created_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |
| updated_at | timestamp with time zone | YES | CURRENT_TIMESTAMP |

### Foreign Keys

| Column | References |
|--------|------------|
| user_id | users.id |

---

## Table: `user_preferences`

**Primary Keys:** id

### Columns

| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | uuid | NO | gen_random_uuid() |
| user_id | uuid | NO |  |
| theme | character varying(20) | NO |  |
| notifications_enabled | boolean | NO |  |
| email_notifications | boolean | NO |  |
| push_notifications | boolean | NO |  |
| currency | character varying(3) | NO |  |
| timezone | character varying(50) | NO |  |
| language | character varying(10) | NO |  |
| financial_goals | jsonb | YES |  |
| risk_tolerance | character varying(20) | YES |  |
| investment_horizon | character varying(20) | YES |  |
| created_at | timestamp with time zone | NO |  |
| updated_at | timestamp with time zone | NO |  |

### Foreign Keys

| Column | References |
|--------|------------|
| user_id | users.id |

---

## Table: `users`

**Primary Keys:** id

### Columns

| Column | Type | Nullable | Default |
|--------|------|----------|----------|
| id | uuid | NO |  |
| email | character varying(255) | NO |  |
| first_name | character varying(100) | NO |  |
| last_name | character varying(100) | NO |  |
| password_hash | character varying(255) | NO |  |
| is_active | boolean | NO |  |
| is_advisor | boolean | NO |  |
| created_at | timestamp with time zone | NO |  |
| updated_at | timestamp with time zone | NO |  |
| default_checking_buffer | numeric | YES | 2000.00 |
| auto_allocation_enabled | boolean | YES | true |
| allocation_refresh_frequency | character varying(20) | YES | 'daily'::character varying |
| plaid_access_token | text | YES |  |
| country_code | character(2) | YES | 'US'::bpchar |
| region_code | character varying(10) | YES |  |
| currency_preference | character varying(3) | YES | 'USD'::character varying |

---

