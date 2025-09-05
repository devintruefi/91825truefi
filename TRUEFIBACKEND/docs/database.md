database schema:

 schema |           table            |              column               | position |           type           | nullable |                     default_value                     
--------+----------------------------+-----------------------------------+----------+--------------------------+----------+-------------------------------------------------------
 public | _prisma_migrations         | id                                |        1 | character varying        | NO       | 
 public | _prisma_migrations         | checksum                          |        2 | character varying        | NO       | 
 public | _prisma_migrations         | finished_at                       |        3 | timestamp with time zone | YES      | 
 public | _prisma_migrations         | migration_name                    |        4 | character varying        | NO       | 
 public | _prisma_migrations         | logs                              |        5 | text                     | YES      | 
 public | _prisma_migrations         | rolled_back_at                    |        6 | timestamp with time zone | YES      | 
 public | _prisma_migrations         | started_at                        |        7 | timestamp with time zone | NO       | now()
 public | _prisma_migrations         | applied_steps_count               |        8 | integer                  | NO       | 0
 public | accounts                   | id                                |        1 | uuid                     | NO       | 
 public | accounts                   | user_id                           |        2 | uuid                     | NO       | 
 public | accounts                   | plaid_account_id                  |        3 | character varying        | NO       | 
 public | accounts                   | name                              |        4 | character varying        | NO       | 
 public | accounts                   | type                              |        5 | character varying        | NO       | 
 public | accounts                   | subtype                           |        6 | character varying        | YES      | 
 public | accounts                   | mask                              |        7 | character varying        | YES      | 
 public | accounts                   | institution_name                  |        8 | character varying        | YES      | 
 public | accounts                   | balance                           |        9 | numeric                  | YES      | 
 public | accounts                   | currency                          |       10 | character varying        | YES      | 
 public | accounts                   | is_active                         |       11 | boolean                  | YES      | 
 public | accounts                   | created_at                        |       12 | timestamp with time zone | YES      | CURRENT_TIMESTAMP
 public | accounts                   | updated_at                        |       13 | timestamp with time zone | YES      | 
 public | accounts                   | plaid_connection_id               |       14 | uuid                     | YES      | 
 public | accounts                   | plaid_item_id                     |       15 | text                     | YES      | 
 public | accounts                   | available_balance                 |       16 | numeric                  | YES      | 
 public | accounts                   | limit_amount                      |       17 | numeric                  | YES      | 
 public | accounts                   | institution_id                    |       18 | uuid                     | YES      | 
 public | accounts                   | official_name                     |       19 | text                     | YES      | 
 public | accounts                   | persistent_account_id             |       20 | text                     | YES      | 
 public | accounts                   | balances_last_updated             |       21 | timestamp with time zone | YES      | 
 public | accounts                   | unofficial_currency_code          |       22 | text                     | YES      | 
 public | agent_run_log              | id                                |        1 | uuid                     | NO       | 
 public | agent_run_log              | user_id                           |        2 | uuid                     | NO       | 
 public | agent_run_log              | agent_name                        |        3 | character varying        | NO       | 
 public | agent_run_log              | input_data                        |        4 | json                     | YES      | 
 public | agent_run_log              | output_data                       |        5 | json                     | YES      | 
 public | agent_run_log              | sql_queries                       |        6 | json                     | YES      | 
 public | agent_run_log              | api_calls                         |        7 | json                     | YES      | 
 public | agent_run_log              | error_message                     |        8 | text                     | YES      | 
 public | agent_run_log              | execution_time_ms                 |        9 | numeric                  | YES      | 
 public | agent_run_log              | timestamp                         |       10 | timestamp with time zone | YES      | CURRENT_TIMESTAMP
 public | allocation_history         | id                                |        1 | uuid                     | NO       | gen_random_uuid()
 public | allocation_history         | user_id                           |        2 | uuid                     | YES      | 
 public | allocation_history         | goal_id                           |        3 | uuid                     | YES      | 
 public | allocation_history         | calculated_amount                 |        4 | numeric                  | YES      | 
 public | allocation_history         | calculation_method                |        5 | character varying        | YES      | 
 public | allocation_history         | account_snapshot                  |        6 | jsonb                    | YES      | 
 public | allocation_history         | created_at                        |        7 | timestamp with time zone | YES      | CURRENT_TIMESTAMP
 public | asset_valuations           | id                                |        1 | bigint                   | NO       | nextval('asset_valuations_id_seq'::regclass)
 public | asset_valuations           | asset_id                          |        2 | uuid                     | NO       | 
 public | asset_valuations           | as_of_date                        |        3 | date                     | NO       | 
 public | asset_valuations           | value                             |        4 | numeric                  | NO       | 
 public | asset_valuations           | method                            |        5 | text                     | YES      | 
 public | asset_valuations           | source                            |        6 | text                     | YES      | 
 public | asset_valuations           | created_at                        |        7 | timestamp with time zone | YES      | CURRENT_TIMESTAMP
 public | budget_categories          | id                                |        1 | uuid                     | NO       | 
 public | budget_categories          | budget_id                         |        2 | uuid                     | NO       | 
 public | budget_categories          | category                          |        3 | character varying        | NO       | 
 public | budget_categories          | amount                            |        4 | numeric                  | NO       | 
 public | budget_categories          | created_at                        |        5 | timestamp with time zone | YES      | CURRENT_TIMESTAMP
 public | budget_categories          | updated_at                        |        6 | timestamp with time zone | YES      | 
 public | budget_spending            | id                                |        1 | uuid                     | NO       | gen_random_uuid()
 public | budget_spending            | category_id                       |        2 | uuid                     | NO       | 
 public | budget_spending            | manual_amount                     |        3 | numeric                  | YES      | 0
 public | budget_spending            | month                             |        4 | smallint                 | NO       | 
 public | budget_spending            | year                              |        5 | integer                  | NO       | 
 public | budget_spending            | created_at                        |        6 | timestamp with time zone | YES      | CURRENT_TIMESTAMP
 public | budget_spending            | updated_at                        |        7 | timestamp with time zone | YES      | CURRENT_TIMESTAMP
 public | budgets                    | id                                |        1 | uuid                     | NO       | 
 public | budgets                    | user_id                           |        2 | uuid                     | NO       | 
 public | budgets                    | name                              |        3 | character varying        | NO       | 
 public | budgets                    | description                       |        4 | text                     | YES      | 
 public | budgets                    | amount                            |        5 | numeric                  | NO       | 
 public | budgets                    | period                            |        6 | character varying        | YES      | 
 public | budgets                    | start_date                        |        7 | timestamp with time zone | NO       | 
 public | budgets                    | end_date                          |        8 | timestamp with time zone | YES      | 
 public | budgets                    | is_active                         |        9 | boolean                  | YES      | 
 public | budgets                    | created_at                        |       10 | timestamp with time zone | YES      | CURRENT_TIMESTAMP
 public | budgets                    | updated_at                        |       11 | timestamp with time zone | YES      | 
 public | business_ownership_details | id                                |        1 | uuid                     | NO       | gen_random_uuid()
 public | business_ownership_details | manual_asset_id                   |        2 | uuid                     | NO       | 
 public | business_ownership_details | business_name                     |        3 | text                     | YES      | 
 public | business_ownership_details | ownership_percentage              |        4 | numeric                  | YES      | 
 public | business_ownership_details | valuation                         |        5 | numeric                  | YES      | 
 public | business_ownership_details | annual_income                     |        6 | numeric                  | YES      | 
 public | business_ownership_details | acquisition_date                  |        7 | date                     | YES      | 
 public | business_ownership_details | created_at                        |        8 | timestamp with time zone | YES      | CURRENT_TIMESTAMP
 public | business_ownership_details | updated_at                        |        9 | timestamp with time zone | YES      | CURRENT_TIMESTAMP
 public | chat_history               | id                                |        1 | uuid                     | NO       | 
 public | chat_history               | user_id                           |        2 | uuid                     | NO       | 
 public | chat_history               | session_id                        |        3 | character varying        | NO       | 
 public | chat_history               | message                           |        4 | text                     | NO       | 
 public | chat_history               | response                          |        5 | text                     | NO       | 
 public | chat_history               | intent                            |        6 | character varying        | YES      | 
 public | chat_history               | confidence                        |        7 | numeric                  | YES      | 
 public | chat_history               | created_at                        |        8 | timestamp with time zone | YES      | CURRENT_TIMESTAMP
 public | chat_messages              | id                                |        1 | uuid                     | NO       | 
 public | chat_messages              | session_id                        |        2 | uuid                     | NO       | 
 public | chat_messages              | message_type                      |        3 | character varying        | NO       | 
 public | chat_messages              | content                           |        4 | text                     | NO       | 
 public | chat_messages              | rich_content                      |        5 | jsonb                    | YES      | 
 public | chat_messages              | turn_number                       |        6 | integer                  | NO       | 
 public | chat_messages              | created_at                        |        7 | timestamp with time zone | NO       | 
 public | chat_messages              | user_id                           |        8 | uuid                     | NO       | 
 public | chat_sessions              | id                                |        1 | uuid                     | NO       | 
 public | chat_sessions              | user_id                           |        2 | uuid                     | NO       | 
 public | chat_sessions              | session_id                        |        3 | character varying        | NO       | 
 public | chat_sessions              | title                             |        4 | character varying        | YES      | 
 public | chat_sessions              | is_active                         |        5 | boolean                  | NO       | 
 public | chat_sessions              | created_at                        |        6 | timestamp with time zone | NO       | 
 public | chat_sessions              | updated_at                        |        7 | timestamp with time zone | NO       | 
 public | collectible_details        | id                                |        1 | uuid                     | NO       | gen_random_uuid()
 public | collectible_details        | manual_asset_id                   |        2 | uuid                     | NO       | 
 public | collectible_details        | category                          |        3 | text                     | YES      | 
 public | collectible_details        | description                       |        4 | text                     | YES      | 
 public | collectible_details        | acquisition_date                  |        5 | date                     | YES      | 
 public | collectible_details        | acquisition_cost                  |        6 | numeric                  | YES      | 
 public | collectible_details        | estimated_value                   |        7 | numeric                  | YES      | 
 public | collectible_details        | appraisal_date                    |        8 | date                     | YES      | 
 public | collectible_details        | created_at                        |        9 | timestamp with time zone | YES      | CURRENT_TIMESTAMP
 public | collectible_details        | updated_at                        |       10 | timestamp with time zone | YES      | CURRENT_TIMESTAMP
 public | contribution_schedule      | id                                |        1 | uuid                     | NO       | gen_random_uuid()
 public | contribution_schedule      | account_id                        |        2 | uuid                     | YES      | 
 public | contribution_schedule      | user_id                           |        3 | uuid                     | YES      | 
 public | contribution_schedule      | monthly_amount                    |        4 | numeric                  | YES      | 
 public | contribution_schedule      | employer_match                    |        5 | numeric                  | YES      | 
 public | credit_card_aprs           | account_id                        |        1 | uuid                     | YES      | 
 public | credit_card_aprs           | apr_type                          |        2 | text                     | YES      | 
 public | credit_card_aprs           | apr_percentage                    |        3 | numeric                  | YES      | 
 public | credit_card_aprs           | balance_subject_to_apr            |        4 | numeric                  | YES      | 
 public | credit_card_aprs           | interest_charge_amount            |        5 | numeric                  | YES      | 
 public | credit_card_aprs           | id                                |        6 | bigint                   | NO       | nextval('credit_card_aprs_id_seq'::regclass)
 public | estate_docs                | id                                |        1 | uuid                     | NO       | 
 public | estate_docs                | user_id                           |        2 | uuid                     | NO       | 
 public | estate_docs                | type                              |        3 | character varying        | NO       | 
 public | estate_docs                | name                              |        4 | character varying        | NO       | 
 public | estate_docs                | description                       |        5 | text                     | YES      | 
 public | estate_docs                | file_path                         |        6 | character varying        | YES      | 
 public | estate_docs                | created_date                      |        7 | timestamp with time zone | YES      | 
 public | estate_docs                | last_updated                      |        8 | timestamp with time zone | YES      | 
 public | estate_docs                | is_active                         |        9 | boolean                  | YES      | 
 public | estate_docs                | created_at                        |       10 | timestamp with time zone | YES      | CURRENT_TIMESTAMP
 public | estate_docs                | updated_at                        |       11 | timestamp with time zone | YES      | 
 public | financial_insights         | id                                |        1 | uuid                     | NO       | 
 public | financial_insights         | user_id                           |        2 | uuid                     | NO       | 
 public | financial_insights         | insight_type                      |        3 | character varying        | NO       | 
 public | financial_insights         | title                             |        4 | character varying        | NO       | 
 public | financial_insights         | description                       |        5 | text                     | NO       | 
 public | financial_insights         | severity                          |        6 | character varying        | NO       | 
 public | financial_insights         | data                              |        7 | jsonb                    | YES      | 
 public | financial_insights         | is_read                           |        8 | boolean                  | NO       | 
 public | financial_insights         | expires_at                        |        9 | timestamp with time zone | YES      | 
 public | financial_insights         | created_at                        |       10 | timestamp with time zone | NO       | 
 public | goal_accounts              | id                                |        1 | uuid                     | NO       | gen_random_uuid()
 public | goal_accounts              | goal_id                           |        2 | uuid                     | NO       | 
 public | goal_accounts              | account_id                        |        3 | uuid                     | NO       | 
 public | goal_accounts              | allocation_percentage             |        4 | numeric                  | YES      | 100.00
 public | goal_accounts              | allocation_type                   |        5 | character varying        | YES      | 'percentage'::character varying
 public | goal_accounts              | fixed_amount                      |        6 | numeric                  | YES      | 
 public | goal_accounts              | threshold_amount                  |        7 | numeric                  | YES      | 
 public | goal_accounts              | is_active                         |        8 | boolean                  | YES      | true
 public | goal_accounts              | created_at                        |        9 | timestamp with time zone | YES      | CURRENT_TIMESTAMP
 public | goal_accounts              | updated_at                        |       10 | timestamp with time zone | YES      | CURRENT_TIMESTAMP
 public | goals                      | id                                |        1 | uuid                     | NO       | 
 public | goals                      | user_id                           |        2 | uuid                     | NO       | 
 public | goals                      | name                              |        3 | character varying        | NO       | 
 public | goals                      | description                       |        4 | text                     | YES      | 
 public | goals                      | target_amount                     |        5 | numeric                  | NO       | 
 public | goals                      | current_amount                    |        6 | numeric                  | YES      | 
 public | goals                      | target_date                       |        7 | timestamp with time zone | YES      | 
 public | goals                      | priority                          |        8 | character varying        | YES      | 
 public | goals                      | is_active                         |        9 | boolean                  | YES      | 
 public | goals                      | created_at                        |       10 | timestamp with time zone | YES      | CURRENT_TIMESTAMP
 public | goals                      | updated_at                        |       11 | timestamp with time zone | YES      | 
 public | goals                      | allocation_method                 |       12 | character varying        | YES      | 'auto'::character varying
 public | goals                      | checking_buffer_amount            |       13 | numeric                  | YES      | 2000.00
 public | goals                      | allocation_percentage             |       14 | numeric                  | YES      | 
 public | goals                      | allocation_priority               |       15 | integer                  | YES      | 5
 public | goals                      | auto_calculated_amount            |       16 | numeric                  | YES      | 
 public | goals                      | last_auto_calculation             |       17 | timestamp with time zone | YES      | 
 public | holdings                   | id                                |        1 | uuid                     | NO       | gen_random_uuid()
 public | holdings                   | account_id                        |        2 | uuid                     | YES      | 
 public | holdings                   | security_id                       |        3 | uuid                     | YES      | 
 public | holdings                   | quantity                          |        4 | numeric                  | YES      | 
 public | holdings                   | cost_basis                        |        5 | numeric                  | YES      | 
 public | holdings                   | institution_price                 |        6 | numeric                  | YES      | 
 public | holdings                   | institution_value                 |        7 | numeric                  | YES      | 
 public | holdings                   | last_price_date                   |        8 | date                     | YES      | 
 public | holdings                   | created_at                        |        9 | timestamp with time zone | YES      | CURRENT_TIMESTAMP
 public | holdings                   | updated_at                        |       10 | timestamp with time zone | YES      | CURRENT_TIMESTAMP
 public | holdings                   | institution_price_as_of           |       11 | date                     | YES      | 
 public | holdings                   | institution_price_datetime        |       12 | timestamp with time zone | YES      | 
 public | holdings                   | position_iso_currency_code        |       13 | character varying        | YES      | 
 public | holdings                   | position_unofficial_currency_code |       14 | text                     | YES      | 
 public | holdings                   | vested_quantity                   |       15 | numeric                  | YES      | 
 public | holdings                   | vested_value                      |       16 | numeric                  | YES      | 
 public | holdings_current           | id                                |        1 | uuid                     | NO       | gen_random_uuid()
 public | holdings_current           | account_id                        |        2 | uuid                     | NO       | 
 public | holdings_current           | security_id                       |        3 | uuid                     | NO       | 
 public | holdings_current           | quantity                          |        4 | numeric                  | NO       | 
 public | holdings_current           | cost_basis_total                  |        5 | numeric                  | YES      | 
 public | holdings_current           | market_value                      |        6 | numeric                  | YES      | 
 public | holdings_current           | as_of_date                        |        7 | date                     | NO       | 
 public | holdings_lots              | id                                |        1 | uuid                     | NO       | gen_random_uuid()
 public | holdings_lots              | account_id                        |        2 | uuid                     | NO       | 
 public | holdings_lots              | security_id                       |        3 | uuid                     | NO       | 
 public | holdings_lots              | lot_opened_at                     |        4 | date                     | YES      | 
 public | holdings_lots              | quantity                          |        5 | numeric                  | NO       | 
 public | holdings_lots              | cost_basis_total                  |        6 | numeric                  | YES      | 
 public | holdings_lots              | market_value                      |        7 | numeric                  | YES      | 
 public | holdings_lots              | as_of_date                        |        8 | date                     | NO       | 
 public | institutions               | id                                |        1 | uuid                     | NO       | gen_random_uuid()
 public | institutions               | plaid_institution_id              |        2 | text                     | YES      | 
 public | institutions               | name                              |        3 | text                     | NO       | 
 public | institutions               | country_code                      |        4 | character                | YES      | 'US'::bpchar
 public | institutions               | created_at                        |        5 | timestamp with time zone | YES      | CURRENT_TIMESTAMP
 public | institutions               | logo_url                          |        6 | text                     | YES      | 
 public | institutions               | products                          |        7 | ARRAY                    | YES      | 
 public | institutions               | updated_at                        |        8 | timestamp with time zone | YES      | CURRENT_TIMESTAMP
 public | insurances                 | id                                |        1 | uuid                     | NO       | 
 public | insurances                 | user_id                           |        2 | uuid                     | NO       | 
 public | insurances                 | type                              |        3 | character varying        | NO       | 
 public | insurances                 | provider                          |        4 | character varying        | NO       | 
 public | insurances                 | policy_number                     |        5 | character varying        | YES      | 
 public | insurances                 | premium_amount                    |        6 | numeric                  | YES      | 
 public | insurances                 | coverage_amount                   |        7 | numeric                  | YES      | 
 public | insurances                 | start_date                        |        8 | timestamp with time zone | YES      | 
 public | insurances                 | end_date                          |        9 | timestamp with time zone | YES      | 
 public | insurances                 | is_active                         |       10 | boolean                  | YES      | 
 public | insurances                 | created_at                        |       11 | timestamp with time zone | YES      | CURRENT_TIMESTAMP
 public | insurances                 | updated_at                        |       12 | timestamp with time zone | YES      | 
 public | investment_transactions    | id                                |        1 | uuid                     | NO       | gen_random_uuid()
 public | investment_transactions    | user_id                           |        2 | uuid                     | NO       | 
 public | investment_transactions    | account_id                        |        3 | uuid                     | NO       | 
 public | investment_transactions    | security_id                       |        4 | uuid                     | YES      | 
 public | investment_transactions    | plaid_investment_transaction_id   |        5 | text                     | NO       | 
 public | investment_transactions    | date                              |        6 | timestamp with time zone | NO       | 
 public | investment_transactions    | name                              |        7 | text                     | YES      | 
 public | investment_transactions    | type                              |        8 | text                     | YES      | 
 public | investment_transactions    | subtype                           |        9 | text                     | YES      | 
 public | investment_transactions    | amount                            |       10 | numeric                  | YES      | 
 public | investment_transactions    | quantity                          |       11 | numeric                  | YES      | 
 public | investment_transactions    | price                             |       12 | numeric                  | YES      | 
 public | investment_transactions    | fees                              |       13 | numeric                  | YES      | 
 public | investment_transactions    | currency_code                     |       14 | character varying        | YES      | 
 public | investment_transactions    | created_at                        |       15 | timestamp with time zone | YES      | CURRENT_TIMESTAMP
 public | investment_transactions    | cancel_transaction_id             |       16 | text                     | YES      | 
 public | investment_transactions    | unofficial_currency_code          |       17 | text                     | YES      | 
 public | loan_details               | account_id                        |        1 | uuid                     | NO       | 
 public | loan_details               | interest_rate                     |        2 | numeric                  | YES      | 
 public | loan_details               | origination_principal             |        3 | numeric                  | YES      | 
 public | loan_details               | origination_date                  |        4 | date                     | YES      | 
 public | loan_details               | maturity_date                     |        5 | date                     | YES      | 
 public | loan_details               | next_payment_due                  |        6 | date                     | YES      | 
 public | loan_details               | next_payment_amount               |        7 | numeric                  | YES      | 
 public | loan_details               | last_payment_date                 |        8 | date                     | YES      | 
 public | loan_details               | last_payment_amount               |        9 | numeric                  | YES      | 
 public | loan_details               | created_at                        |       10 | timestamp with time zone | YES      | CURRENT_TIMESTAMP
 public | loan_details               | updated_at                        |       11 | timestamp with time zone | YES      | CURRENT_TIMESTAMP
 public | loan_details               | last_statement_balance            |       12 | numeric                  | YES      | 
 public | loan_details               | last_statement_issue_date         |       13 | date                     | YES      | 
 public | loan_details               | minimum_payment_amount            |       14 | numeric                  | YES      | 
 public | loan_details               | escrow_balance                    |       15 | numeric                  | YES      | 
 public | loan_details               | has_pmi                           |       16 | boolean                  | YES      | 
 public | loan_details               | past_due_amount                   |       17 | numeric                  | YES      | 
 public | loan_details               | current_late_fee                  |       18 | numeric                  | YES      | 
 public | loan_details               | ytd_interest_paid                 |       19 | numeric                  | YES      | 
 public | loan_details               | ytd_principal_paid                |       20 | numeric                  | YES      | 
 public | loan_details               | is_overdue                        |       21 | boolean                  | YES      | 
 public | loan_details               | outstanding_interest_amount       |       22 | numeric                  | YES      | 
 public | loan_details               | payment_reference_number          |       23 | text                     | YES      | 
 public | loan_details               | interest_rate_type                |       24 | text                     | YES      | 
 public | loan_details               | has_prepayment_penalty            |       25 | boolean                  | YES      | 
 public | loan_details               | property_address                  |       26 | jsonb                    | YES      | 
 public | manual_assets              | id                                |        1 | uuid                     | NO       | gen_random_uuid()
 public | manual_assets              | user_id                           |        2 | uuid                     | YES      | 
 public | manual_assets              | name                              |        3 | text                     | NO       | 
 public | manual_assets              | asset_class                       |        4 | text                     | YES      | 
 public | manual_assets              | value                             |        5 | numeric                  | YES      | 
 public | manual_assets              | notes                             |        6 | text                     | YES      | 
 public | manual_assets              | created_at                        |        7 | timestamp with time zone | YES      | CURRENT_TIMESTAMP
 public | manual_assets              | updated_at                        |        8 | timestamp with time zone | YES      | CURRENT_TIMESTAMP
 public | manual_liabilities         | id                                |        1 | uuid                     | NO       | gen_random_uuid()
 public | manual_liabilities         | user_id                           |        2 | uuid                     | YES      | 
 public | manual_liabilities         | name                              |        3 | text                     | NO       | 
 public | manual_liabilities         | liability_class                   |        4 | text                     | YES      | 
 public | manual_liabilities         | balance                           |        5 | numeric                  | YES      | 
 public | manual_liabilities         | interest_rate                     |        6 | numeric                  | YES      | 
 public | manual_liabilities         | notes                             |        7 | text                     | YES      | 
 public | manual_liabilities         | created_at                        |        8 | timestamp with time zone | YES      | CURRENT_TIMESTAMP
 public | manual_liabilities         | updated_at                        |        9 | timestamp with time zone | YES      | CURRENT_TIMESTAMP
 public | onboarding_progress        | id                                |        1 | integer                  | NO       | nextval('onboarding_progress_id_seq'::regclass)
 public | onboarding_progress        | user_id                           |        2 | uuid                     | NO       | 
 public | onboarding_progress        | current_step                      |        3 | text                     | NO       | 
 public | onboarding_progress        | is_complete                       |        4 | boolean                  | NO       | false
 public | onboarding_progress        | updated_at                        |        5 | timestamp with time zone | NO       | CURRENT_TIMESTAMP
 public | other_manual_asset_details | id                                |        1 | uuid                     | NO       | gen_random_uuid()
 public | other_manual_asset_details | manual_asset_id                   |        2 | uuid                     | NO       | 
 public | other_manual_asset_details | description                       |        3 | text                     | YES      | 
 public | other_manual_asset_details | category                          |        4 | text                     | YES      | 
 public | other_manual_asset_details | acquisition_date                  |        5 | date                     | YES      | 
 public | other_manual_asset_details | acquisition_cost                  |        6 | numeric                  | YES      | 
 public | other_manual_asset_details | estimated_value                   |        7 | numeric                  | YES      | 
 public | other_manual_asset_details | notes                             |        8 | text                     | YES      | 
 public | other_manual_asset_details | created_at                        |        9 | timestamp with time zone | YES      | CURRENT_TIMESTAMP
 public | other_manual_asset_details | updated_at                        |       10 | timestamp with time zone | YES      | CURRENT_TIMESTAMP
 public | other_manual_assets        | id                                |        1 | uuid                     | NO       | gen_random_uuid()
 public | other_manual_assets        | manual_asset_id                   |        2 | uuid                     | NO       | 
 public | other_manual_assets        | description                       |        3 | text                     | YES      | 
 public | other_manual_assets        | category                          |        4 | text                     | YES      | 
 public | other_manual_assets        | acquisition_cost                  |        5 | numeric                  | YES      | 
 public | other_manual_assets        | estimated_value                   |        6 | numeric                  | YES      | 
 public | other_manual_assets        | acquisition_date                  |        7 | date                     | YES      | 
 public | other_manual_assets        | valuation_date                    |        8 | date                     | YES      | 
 public | other_manual_assets        | created_at                        |        9 | timestamp with time zone | YES      | CURRENT_TIMESTAMP
 public | other_manual_assets        | updated_at                        |       10 | timestamp with time zone | YES      | CURRENT_TIMESTAMP
 public | plaid_account_taxonomy     | type                              |        1 | text                     | NO       | 
 public | plaid_account_taxonomy     | subtype                           |        2 | text                     | NO       | 
 public | plaid_category_map         | plaid_category_id                 |        1 | text                     | NO       | 
 public | plaid_category_map         | category_uuid                     |        2 | uuid                     | NO       | 
 public | plaid_connections          | id                                |        1 | uuid                     | NO       | 
 public | plaid_connections          | user_id                           |        2 | uuid                     | NO       | 
 public | plaid_connections          | plaid_access_token                |        3 | character varying        | NO       | 
 public | plaid_connections          | plaid_item_id                     |        4 | character varying        | NO       | 
 public | plaid_connections          | plaid_institution_id_text         |        5 | character varying        | NO       | 
 public | plaid_connections          | is_active                         |        6 | boolean                  | NO       | 
 public | plaid_connections          | last_sync_at                      |        7 | timestamp with time zone | YES      | 
 public | plaid_connections          | created_at                        |        8 | timestamp with time zone | NO       | 
 public | plaid_connections          | updated_at                        |        9 | timestamp with time zone | NO       | 
 public | plaid_connections          | institution_id                    |       10 | uuid                     | YES      | 
 public | plaid_connections          | institution_name                  |       11 | text                     | YES      | 
 public | plaid_import_metadata      | id                                |        1 | uuid                     | NO       | gen_random_uuid()
 public | plaid_import_metadata      | user_id                           |        2 | uuid                     | YES      | 
 public | plaid_import_metadata      | plaid_account_id                  |        3 | text                     | NO       | 
 public | plaid_import_metadata      | import_batch_id                   |        4 | text                     | YES      | 
 public | plaid_import_metadata      | institution_name                  |        5 | text                     | YES      | 
 public | plaid_import_metadata      | import_status                     |        6 | text                     | YES      | 
 public | plaid_import_metadata      | import_timestamp                  |        7 | timestamp with time zone | YES      | 
 public | plaid_import_metadata      | error_details                     |        8 | text                     | YES      | 
 public | real_estate_details        | id                                |        1 | uuid                     | NO       | gen_random_uuid()
 public | real_estate_details        | manual_asset_id                   |        2 | uuid                     | NO       | 
 public | real_estate_details        | address                           |        3 | text                     | YES      | 
 public | real_estate_details        | property_type                     |        4 | text                     | YES      | 
 public | real_estate_details        | is_primary_residence              |        5 | boolean                  | YES      | false
 public | real_estate_details        | purchase_price                    |        6 | numeric                  | YES      | 
 public | real_estate_details        | purchase_date                     |        7 | date                     | YES      | 
 public | real_estate_details        | market_value                      |        8 | numeric                  | YES      | 
 public | real_estate_details        | valuation_date                    |        9 | date                     | YES      | 
 public | real_estate_details        | appreciation_rate                 |       10 | numeric                  | YES      | 
 public | real_estate_details        | property_tax_rate                 |       11 | numeric                  | YES      | 
 public | real_estate_details        | annual_maintenance                |       12 | numeric                  | YES      | 
 public | real_estate_details        | mortgage_account_id               |       13 | uuid                     | YES      | 
 public | real_estate_details        | created_at                        |       14 | timestamp with time zone | YES      | CURRENT_TIMESTAMP
 public | real_estate_details        | updated_at                        |       15 | timestamp with time zone | YES      | CURRENT_TIMESTAMP
 public | real_estate_details        | gross_monthly_rent                |       16 | numeric                  | YES      | 
 public | real_estate_details        | other_income_annual               |       17 | numeric                  | YES      | 
 public | real_estate_details        | vacancy_pct                       |       18 | numeric                  | YES      | 
 public | real_estate_details        | property_mgmt_pct                 |       19 | numeric                  | YES      | 
 public | real_estate_details        | insurance_annual                  |       20 | numeric                  | YES      | 
 public | real_estate_details        | hoa_annual                        |       21 | numeric                  | YES      | 
 public | real_estate_details        | utilities_owner_annual            |       22 | numeric                  | YES      | 
 public | real_estate_details        | capex_reserve_pct                 |       23 | numeric                  | YES      | 
 public | recurring_income           | id                                |        1 | uuid                     | NO       | gen_random_uuid()
 public | recurring_income           | user_id                           |        2 | uuid                     | YES      | 
 public | recurring_income           | source                            |        3 | text                     | YES      | 
 public | recurring_income           | gross_monthly                     |        4 | numeric                  | YES      | 
 public | recurring_income           | next_pay_date                     |        5 | date                     | YES      | 
 public | recurring_income           | inflation_adj                     |        6 | boolean                  | YES      | true
 public | recurring_income           | frequency                         |        7 | text                     | YES      | 
 public | recurring_income           | net_monthly                       |        8 | numeric                  | YES      | 
 public | recurring_income           | employer                          |        9 | text                     | YES      | 
 public | recurring_income           | effective_from                    |       10 | date                     | YES      | 
 public | recurring_income           | effective_to                      |       11 | date                     | YES      | 
 public | recurring_income           | is_net                            |       12 | boolean                  | NO       | false
 public | recurring_income           | metadata                          |       13 | jsonb                    | YES      | '{}'::jsonb
 public | securities                 | id                                |        1 | uuid                     | NO       | gen_random_uuid()
 public | securities                 | name                              |        2 | text                     | YES      | 
 public | securities                 | ticker                            |        3 | text                     | YES      | 
 public | securities                 | security_type                     |        4 | text                     | YES      | 
 public | securities                 | cusip                             |        5 | text                     | YES      | 
 public | securities                 | isin                              |        6 | text                     | YES      | 
 public | securities                 | currency                          |        7 | character                | YES      | 'USD'::bpchar
 public | securities                 | created_at                        |        8 | timestamp with time zone | YES      | CURRENT_TIMESTAMP
 public | securities                 | is_cash_equivalent                |        9 | boolean                  | YES      | 
 public | securities                 | institution_security_id           |       10 | text                     | YES      | 
 public | securities                 | institution_id                    |       11 | text                     | YES      | 
 public | securities                 | proxy_security_id                 |       12 | text                     | YES      | 
 public | securities                 | sedol                             |       13 | text                     | YES      | 
 public | securities                 | plaid_security_id                 |       14 | text                     | YES      | 
 public | student_loan_details       | id                                |        1 | uuid                     | NO       | gen_random_uuid()
 public | student_loan_details       | account_id                        |        2 | uuid                     | NO       | 
 public | student_loan_details       | account_number                    |        3 | text                     | YES      | 
 public | student_loan_details       | loan_name                         |        4 | text                     | YES      | 
 public | student_loan_details       | loan_status_type                  |        5 | text                     | YES      | 
 public | student_loan_details       | loan_status_end_date              |        6 | date                     | YES      | 
 public | student_loan_details       | expected_payoff_date              |        7 | date                     | YES      | 
 public | student_loan_details       | guarantor                         |        8 | text                     | YES      | 
 public | student_loan_details       | disbursement_dates                |        9 | ARRAY                    | YES      | 
 public | student_loan_details       | interest_rate_percentage          |       10 | numeric                  | YES      | 
 public | student_loan_details       | repayment_plan_type               |       11 | text                     | YES      | 
 public | student_loan_details       | repayment_plan_description        |       12 | text                     | YES      | 
 public | student_loan_details       | pslf_payments_made                |       13 | integer                  | YES      | 
 public | student_loan_details       | pslf_payments_remaining           |       14 | integer                  | YES      | 
 public | student_loan_details       | pslf_estimated_eligibility_date   |       15 | date                     | YES      | 
 public | student_loan_details       | servicer_address                  |       16 | jsonb                    | YES      | 
 public | student_loan_details       | ytd_interest_paid                 |       17 | numeric                  | YES      | 
 public | student_loan_details       | ytd_principal_paid                |       18 | numeric                  | YES      | 
 public | student_loan_details       | created_at                        |       19 | timestamp with time zone | NO       | CURRENT_TIMESTAMP
 public | student_loan_details       | last_payment_date                 |       20 | date                     | YES      | 
 public | student_loan_details       | last_payment_amount               |       21 | numeric                  | YES      | 
 public | student_loan_details       | next_payment_due                  |       22 | date                     | YES      | 
 public | student_loan_details       | minimum_payment_amount            |       23 | numeric                  | YES      | 
 public | student_loan_details       | origination_principal             |       24 | numeric                  | YES      | 
 public | student_loan_details       | origination_date                  |       25 | date                     | YES      | 
 public | student_loan_details       | outstanding_interest_amount       |       26 | numeric                  | YES      | 
 public | student_loan_details       | payment_reference_number          |       27 | text                     | YES      | 
 public | student_loan_details       | sequence_number                   |       28 | text                     | YES      | 
 public | tax_profile                | user_id                           |        1 | uuid                     | NO       | 
 public | tax_profile                | filing_status                     |        2 | text                     | YES      | 
 public | tax_profile                | state                             |        3 | character                | YES      | 
 public | tax_profile                | federal_rate                      |        4 | numeric                  | YES      | 
 public | tax_profile                | state_rate                        |        5 | numeric                  | YES      | 
 public | transaction_categories     | id                                |        1 | uuid                     | NO       | gen_random_uuid()
 public | transaction_categories     | user_id                           |        2 | uuid                     | YES      | 
 public | transaction_categories     | category_name                     |        3 | text                     | NO       | 
 public | transaction_categories     | parent_category_id                |        4 | uuid                     | YES      | 
 public | transaction_categories     | is_system_defined                 |        5 | boolean                  | YES      | false
 public | transaction_categories     | created_at                        |        6 | timestamp with time zone | YES      | CURRENT_TIMESTAMP
 public | transaction_categories     | is_essential                      |        7 | boolean                  | NO       | false
 public | transaction_categories     | plaid_category_id                 |        8 | text                     | YES      | 
 public | transactions               | id                                |        1 | uuid                     | NO       | 
 public | transactions               | user_id                           |        2 | uuid                     | NO       | 
 public | transactions               | account_id                        |        3 | uuid                     | NO       | 
 public | transactions               | plaid_transaction_id              |        4 | character varying        | NO       | 
 public | transactions               | amount                            |        5 | numeric                  | NO       | 
 public | transactions               | currency_code                     |        6 | character varying        | NO       | 
 public | transactions               | date                              |        7 | timestamp with time zone | NO       | 
 public | transactions               | name                              |        8 | character varying        | NO       | 
 public | transactions               | merchant_name                     |        9 | character varying        | YES      | 
 public | transactions               | category                          |       10 | character varying        | YES      | 
 public | transactions               | category_id                       |       11 | character varying        | YES      | 
 public | transactions               | pending                           |       12 | boolean                  | NO       | 
 public | transactions               | payment_channel                   |       13 | character varying        | YES      | 
 public | transactions               | transaction_type                  |       14 | character varying        | YES      | 
 public | transactions               | location                          |       15 | jsonb                    | YES      | 
 public | transactions               | payment_meta                      |       16 | jsonb                    | YES      | 
 public | transactions               | created_at                        |       17 | timestamp with time zone | NO       | 
 public | transactions               | pfc_primary                       |       18 | text                     | YES      | 
 public | transactions               | pfc_detailed                      |       19 | text                     | YES      | 
 public | transactions               | category_uuid                     |       20 | uuid                     | YES      | 
 public | transactions               | authorized_date                   |       21 | date                     | YES      | 
 public | transactions               | authorized_datetime               |       22 | timestamp with time zone | YES      | 
 public | transactions               | posted_datetime                   |       23 | timestamp with time zone | YES      | 
 public | transactions               | pending_transaction_id            |       24 | character varying        | YES      | 
 public | transactions               | merchant_entity_id                |       25 | text                     | YES      | 
 public | transactions               | pfc_confidence_level              |       26 | text                     | YES      | 
 public | transactions               | transaction_code                  |       27 | text                     | YES      | 
 public | transactions               | account_owner                     |       28 | text                     | YES      | 
 public | transactions               | unofficial_currency_code          |       29 | text                     | YES      | 
 public | user_demographics          | user_id                           |        1 | uuid                     | NO       | 
 public | user_demographics          | age                               |        2 | integer                  | YES      | 
 public | user_demographics          | household_income                  |        3 | numeric                  | YES      | 
 public | user_demographics          | marital_status                    |        4 | character varying        | YES      | 
 public | user_demographics          | dependents                        |        5 | integer                  | YES      | 
 public | user_demographics          | life_stage                        |        6 | character varying        | YES      | 
 public | user_demographics          | created_at                        |        7 | timestamp with time zone | NO       | CURRENT_TIMESTAMP
 public | user_demographics          | updated_at                        |        8 | timestamp with time zone | NO       | CURRENT_TIMESTAMP
 public | user_identity              | user_id                           |        1 | uuid                     | NO       | 
 public | user_identity              | full_name                         |        2 | text                     | YES      | 
 public | user_identity              | phone_primary                     |        3 | text                     | YES      | 
 public | user_identity              | email_primary                     |        4 | text                     | YES      | 
 public | user_identity              | street                            |        5 | text                     | YES      | 
 public | user_identity              | city                              |        6 | text                     | YES      | 
 public | user_identity              | state                             |        7 | text                     | YES      | 
 public | user_identity              | postal_code                       |        8 | text                     | YES      | 
 public | user_identity              | created_at                        |        9 | timestamp with time zone | YES      | CURRENT_TIMESTAMP
 public | user_identity              | updated_at                        |       10 | timestamp with time zone | YES      | CURRENT_TIMESTAMP
 public | user_onboarding_responses  | id                                |        1 | integer                  | NO       | nextval('user_onboarding_responses_id_seq'::regclass)
 public | user_onboarding_responses  | user_id                           |        2 | uuid                     | NO       | 
 public | user_onboarding_responses  | question                          |        3 | text                     | NO       | 
 public | user_onboarding_responses  | answer                            |        4 | text                     | NO       | 
 public | user_onboarding_responses  | created_at                        |        5 | timestamp with time zone | NO       | CURRENT_TIMESTAMP
 public | user_passwords             | user_id                           |        1 | uuid                     | NO       | 
 public | user_passwords             | password_hash                     |        2 | text                     | NO       | 
 public | user_passwords             | updated_at                        |        3 | timestamp with time zone | YES      | CURRENT_TIMESTAMP
 public | user_preferences           | id                                |        1 | uuid                     | NO       | gen_random_uuid()
 public | user_preferences           | user_id                           |        2 | uuid                     | NO       | 
 public | user_preferences           | theme                             |        3 | character varying        | NO       | 
 public | user_preferences           | notifications_enabled             |        4 | boolean                  | NO       | 
 public | user_preferences           | email_notifications               |        5 | boolean                  | NO       | 
 public | user_preferences           | push_notifications                |        6 | boolean                  | NO       | 
 public | user_preferences           | currency                          |        7 | character varying        | NO       | 
 public | user_preferences           | timezone                          |        8 | character varying        | NO       | 
 public | user_preferences           | language                          |        9 | character varying        | NO       | 
 public | user_preferences           | financial_goals                   |       10 | jsonb                    | YES      | 
 public | user_preferences           | risk_tolerance                    |       11 | character varying        | YES      | 
 public | user_preferences           | investment_horizon                |       12 | character varying        | YES      | 
 public | user_preferences           | created_at                        |       13 | timestamp with time zone | NO       | 
 public | user_preferences           | updated_at                        |       14 | timestamp with time zone | NO       | 
 public | user_two_factor_auth       | user_id                           |        1 | uuid                     | NO       | 
 public | user_two_factor_auth       | two_factor_method                 |        2 | text                     | YES      | 
 public | user_two_factor_auth       | two_factor_secret                 |        3 | text                     | YES      | 
 public | user_two_factor_auth       | last_verified_at                  |        4 | timestamp with time zone | YES      | 
 public | user_two_factor_auth       | created_at                        |        5 | timestamp with time zone | YES      | CURRENT_TIMESTAMP
 public | users                      | id                                |        1 | uuid                     | NO       | 
 public | users                      | email                             |        2 | character varying        | NO       | 
 public | users                      | first_name                        |        3 | character varying        | NO       | 
 public | users                      | last_name                         |        4 | character varying        | NO       | 
 public | users                      | password_hash                     |        5 | character varying        | NO       | 
 public | users                      | is_active                         |        6 | boolean                  | NO       | 
 public | users                      | is_advisor                        |        7 | boolean                  | NO       | 
 public | users                      | created_at                        |        8 | timestamp with time zone | NO       | 
 public | users                      | updated_at                        |        9 | timestamp with time zone | NO       | 
 public | users                      | default_checking_buffer           |       10 | numeric                  | YES      | 2000.00
 public | users                      | auto_allocation_enabled           |       11 | boolean                  | YES      | true
 public | users                      | allocation_refresh_frequency      |       12 | character varying        | YES      | 'daily'::character varying
 public | users                      | plaid_access_token                |       13 | text                     | YES      | 
 public | users                      | country_code                      |       14 | character                | YES      | 'US'::bpchar
 public | users                      | region_code                       |       15 | character varying        | YES      | 
 public | users                      | currency_preference               |       16 | character varying        | YES      | 'USD'::character varying
 public | vehicle_assets             | id                                |        1 | bigint                   | NO       | nextval('vehicle_assets_id_seq'::regclass)
 public | vehicle_assets             | asset_id                          |        2 | uuid                     | NO       | 
 public | vehicle_assets             | make                              |        3 | text                     | YES      | 
 public | vehicle_assets             | model                             |        4 | text                     | YES      | 
 public | vehicle_assets             | year                              |        5 | integer                  | YES      | 
 public | vehicle_assets             | vin                               |        6 | text                     | YES      | 
 public | vehicle_assets             | purchase_price                    |        7 | numeric                  | YES      | 
 public | vehicle_assets             | purchase_date                     |        8 | date                     | YES      | 
 public | vehicle_assets             | mileage                           |        9 | integer                  | YES      | 
 public | vehicle_assets             | loan_account_id                   |       10 | uuid                     | YES      | 
 public | vehicle_assets             | created_at                        |       11 | timestamp with time zone | YES      | CURRENT_TIMESTAMP
 public | vehicle_assets             | updated_at                        |       12 | timestamp with time zone | YES      | CURRENT_TIMESTAMP
 public | vehicle_assets_old         | id                                |        1 | uuid                     | NO       | gen_random_uuid()
 public | vehicle_assets_old         | manual_asset_id                   |        2 | uuid                     | NO       | 
 public | vehicle_assets_old         | make                              |        3 | text                     | YES      | 
 public | vehicle_assets_old         | model                             |        4 | text                     | YES      | 
 public | vehicle_assets_old         | year                              |        5 | integer                  | YES      | 
 public | vehicle_assets_old         | vin                               |        6 | text                     | YES      | 
 public | vehicle_assets_old         | purchase_price                    |        7 | numeric                  | YES      | 
 public | vehicle_assets_old         | purchase_date                     |        8 | date                     | YES      | 
 public | vehicle_assets_old         | mileage                           |        9 | integer                  | YES      | 
 public | vehicle_assets_old         | estimated_value                   |       10 | numeric                  | YES      | 
 public | vehicle_assets_old         | valuation_date                    |       11 | date                     | YES      | 
 public | vehicle_assets_old         | created_at                        |       12 | timestamp with time zone | YES      | CURRENT_TIMESTAMP
 public | vehicle_assets_old         | updated_at                        |       13 | timestamp with time zone | YES      | CURRENT_TIMESTAMP
 public | vehicle_details            | id                                |        1 | uuid                     | NO       | gen_random_uuid()
 public | vehicle_details            | manual_asset_id                   |        2 | uuid                     | NO       | 
 public | vehicle_details            | vin                               |        3 | text                     | YES      | 
 public | vehicle_details            | make                              |        4 | text                     | YES      | 
 public | vehicle_details            | model                             |        5 | text                     | YES      | 
 public | vehicle_details            | year                              |        6 | integer                  | YES      | 
 public | vehicle_details            | mileage                           |        7 | numeric                  | YES      | 
 public | vehicle_details            | purchase_price                    |        8 | numeric                  | YES      | 
 public | vehicle_details            | purchase_date                     |        9 | date                     | YES      | 
 public | vehicle_details            | estimated_value                   |       10 | numeric                  | YES      | 
 public | vehicle_details            | loan_account_id                   |       11 | uuid                     | YES      | 
 public | vehicle_details            | created_at                        |       12 | timestamp with time zone | YES      | CURRENT_TIMESTAMP
 public | vehicle_details            | updated_at                        |       13 | timestamp with time zone | YES      | CURRENT_TIMESTAMP
 public | waitlist_entries           | id                                |        1 | uuid                     | NO       | gen_random_uuid()
 public | waitlist_entries           | first_name                        |        2 | character varying        | NO       | 
 public | waitlist_entries           | last_name                         |        3 | character varying        | NO       | 
 public | waitlist_entries           | email                             |        4 | character varying        | NO       | 
 public | waitlist_entries           | phone                             |        5 | character varying        | YES      | 
 public | waitlist_entries           | financial_goal                    |        6 | character varying        | YES      | 
 public | waitlist_entries           | current_situation                 |        7 | character varying        | YES      | 
 public | waitlist_entries           | interests                         |        8 | jsonb                    | YES      | 
 public | waitlist_entries           | money_management_methods          |        9 | jsonb                    | YES      | 
 public | waitlist_entries           | other_money_management            |       10 | text                     | YES      | 
 public | waitlist_entries           | must_have_features                |       11 | text                     | YES      | 
 public | waitlist_entries           | referral_source                   |       12 | character varying        | YES      | 
 public | waitlist_entries           | additional_comments               |       13 | text                     | YES      | 
 public | waitlist_entries           | newsletter_opt_in                 |       14 | boolean                  | YES      | false
 public | waitlist_entries           | updates_opt_in                    |       15 | boolean                  | YES      | false
 public | waitlist_entries           | created_at                        |       16 | timestamp with time zone | YES      | now()
 public | waitlist_entries           | updated_at                        |       17 | timestamp with time zone | YES      | now()
 public | waitlist_entries           | converted_to_user_id              |       18 | uuid                     | YES      | 
(575 rows)