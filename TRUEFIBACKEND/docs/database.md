table_schema |         table_name         |           column_name           |          data_type          
--------------+----------------------------+---------------------------------+-----------------------------
 public       | accounts                   | id                              | uuid
 public       | accounts                   | user_id                         | uuid
 table_schema |         table_name         |           column_name           |          data_type          
--------------+----------------------------+---------------------------------+-----------------------------
 public       | accounts                   | id                              | uuid
 public       | accounts                   | user_id                         | uuid
 public       | accounts                   | plaid_account_id                | character varying
 public       | accounts                   | name                            | character varying
 public       | accounts                   | type                            | character varying
 public       | accounts                   | subtype                         | character varying
 public       | accounts                   | mask                            | character varying
 public       | accounts                   | institution_name                | character varying
 public       | accounts                   | balance                         | numeric
 public       | accounts                   | currency                        | character varying
 public       | accounts                   | is_active                       | boolean
 public       | accounts                   | created_at                      | timestamp with time zone
 public       | accounts                   | updated_at                      | timestamp with time zone
 public       | accounts                   | plaid_connection_id             | uuid
 public       | accounts                   | plaid_item_id                   | text
 public       | accounts                   | plaid_type                      | text
 public       | accounts                   | plaid_subtype                   | text
 public       | accounts                   | available_balance               | numeric
 public       | accounts                   | limit_amount                    | numeric
 public       | accounts                   | institution_id                  | uuid
 public       | accounts                   | joint_account_holders           | ARRAY
 public       | accounts                   | account_purpose                 | text
 public       | accounts                   | apy                             | numeric
 public       | accounts                   | interest_rate                   | numeric
 public       | accounts                   | overdraft_protection            | boolean
 public       | accounts                   | account_alerts_enabled          | boolean
 public       | agent_action_log           | id                              | integer
 public       | agent_action_log           | user_id                         | uuid
 public       | agent_action_log           | action                          | text
 public       | agent_action_log           | source                          | text
 public       | agent_action_log           | created_at                      | timestamp with time zone
 public       | agent_audit_events         | id                              | integer
 public       | agent_audit_events         | session_id                      | uuid
 public       | agent_audit_events         | user_id                         | uuid
 public       | agent_audit_events         | event_type                      | text
 public       | agent_audit_events         | event_data                      | jsonb
 public       | agent_audit_events         | created_at                      | timestamp with time zone
 public       | agent_permissions          | id                              | integer
 public       | agent_permissions          | user_id                         | uuid
 public       | agent_permissions          | action                          | text
 public       | agent_permissions          | allowed                         | boolean
 public       | agent_permissions          | granted_at                      | timestamp with time zone
 public       | agent_run_log              | id                              | uuid
 public       | agent_run_log              | user_id                         | uuid
 public       | agent_run_log              | agent_name                      | character varying
 public       | agent_run_log              | input_data                      | json
 public       | agent_run_log              | output_data                     | json
 public       | agent_run_log              | sql_queries                     | json
 public       | agent_run_log              | api_calls                       | json
 public       | agent_run_log              | error_message                   | text
 public       | agent_run_log              | execution_time_ms               | numeric
 public       | agent_run_log              | timestamp                       | timestamp with time zone
 public       | agent_tasks                | id                              | integer
 public       | agent_tasks                | user_id                         | uuid
 public       | agent_tasks                | task_type                       | text
 public       | agent_tasks                | parameters                      | jsonb
 public       | agent_tasks                | status                          | text
 public       | agent_tasks                | created_at                      | timestamp with time zone
 public       | agent_tasks                | completed_at                    | timestamp with time zone
 public       | ai_conversation_context    | id                              | integer
 public       | ai_conversation_context    | user_id                         | uuid
 public       | ai_conversation_context    | context                         | jsonb
 public       | ai_conversation_context    | created_at                      | timestamp with time zone
 public       | ai_feedback                | id                              | integer
 public       | ai_feedback                | message_id                      | uuid
 public       | ai_feedback                | user_id                         | uuid
 public       | ai_feedback                | rating                          | integer
 public       | ai_feedback                | comment                         | text
 public       | ai_feedback                | created_at                      | timestamp with time zone
 public       | ai_fine_tuning_data        | id                              | integer
 public       | ai_fine_tuning_data        | user_id                         | uuid
 public       | ai_fine_tuning_data        | prompt                          | text
 public       | ai_fine_tuning_data        | completion                      | text
 public       | ai_fine_tuning_data        | rating                          | integer
 public       | ai_fine_tuning_data        | created_at                      | timestamp with time zone
 public       | budget_categories          | id                              | uuid
 public       | budget_categories          | budget_id                       | uuid
 public       | budget_categories          | category                        | character varying
 public       | budget_categories          | amount                          | numeric
 public       | budget_categories          | created_at                      | timestamp with time zone
 public       | budget_categories          | updated_at                      | timestamp with time zone
 public       | budget_categories          | is_fixed                        | boolean
 public       | budgets                    | id                              | uuid
 public       | budgets                    | user_id                         | uuid
 public       | budgets                    | name                            | character varying
 public       | budgets                    | description                     | text
 public       | budgets                    | amount                          | numeric
 public       | budgets                    | period                          | character varying
 public       | budgets                    | start_date                      | timestamp with time zone
 public       | budgets                    | end_date                        | timestamp with time zone
 public       | budgets                    | is_active                       | boolean
 public       | budgets                    | created_at                      | timestamp with time zone
 public       | budgets                    | updated_at                      | timestamp with time zone
 public       | business_assets            | id                              | uuid
 public       | business_assets            | manual_asset_id                 | uuid
 public       | business_assets            | business_name                   | text
 public       | business_assets            | ownership_percentage            | numeric
 public       | business_assets            | valuation                       | numeric
 public       | business_assets            | annual_income                   | numeric
 public       | business_assets            | acquisition_date                | date
 public       | business_assets            | created_at                      | timestamp with time zone
 public       | business_assets            | updated_at                      | timestamp with time zone
 public       | business_assets            | name                            | text
 public       | business_assets            | asset_class                     | text
 public       | business_assets            | value                           | numeric
 public       | business_ownership_details | id                              | uuid
 public       | business_ownership_details | manual_asset_id                 | uuid
 public       | business_ownership_details | business_name                   | text
 public       | business_ownership_details | ownership_percentage            | numeric
 public       | business_ownership_details | valuation                       | numeric
 public       | business_ownership_details | annual_income                   | numeric
 public       | business_ownership_details | acquisition_date                | date
 public       | business_ownership_details | created_at                      | timestamp with time zone
 public       | business_ownership_details | updated_at                      | timestamp with time zone
 public       | business_ownership_details | planned_exit_date               | date
 public       | business_ownership_details | growth_rate                     | numeric
 public       | cashflow_analysis          | id                              | integer
 public       | cashflow_analysis          | user_id                         | uuid
 public       | cashflow_analysis          | period_start                    | date
 public       | cashflow_analysis          | period_end                      | date
 public       | cashflow_analysis          | net_cashflow                    | numeric
 public       | cashflow_analysis          | breakdown                       | jsonb
 public       | cashflow_analysis          | created_at                      | timestamp with time zone
 public       | chat_history               | id                              | uuid
 public       | chat_history               | user_id                         | uuid
 public       | chat_history               | session_id                      | character varying
 public       | chat_history               | message                         | text
 public       | chat_history               | response                        | text
 public       | chat_history               | intent                          | character varying
 public       | chat_history               | confidence                      | numeric
 public       | chat_history               | created_at                      | timestamp with time zone
 public       | chat_messages              | id                              | uuid
 public       | chat_messages              | session_id                      | uuid
 public       | chat_messages              | message_type                    | character varying
 public       | chat_messages              | content                         | text
 public       | chat_messages              | rich_content                    | jsonb
 public       | chat_messages              | turn_number                     | integer
 public       | chat_messages              | created_at                      | timestamp with time zone
 public       | chat_messages              | intent                          | text
 public       | chat_messages              | sentiment                       | text
 public       | chat_messages              | action_suggestion               | text
 public       | chat_session_analyses      | id                              | uuid
 public       | chat_session_analyses      | session_id                      | uuid
 public       | chat_session_analyses      | user_id                         | uuid
 public       | chat_session_analyses      | summary                         | text
 public       | chat_session_analyses      | sentiment_analysis              | jsonb
 public       | chat_session_analyses      | key_topics                      | jsonb
 public       | chat_session_analyses      | action_items                    | jsonb
 public       | chat_session_analyses      | goals_identified                | jsonb
 public       | chat_session_analyses      | risk_assessment                 | character varying
 public       | chat_session_analyses      | next_steps                      | text
 public       | chat_session_analyses      | confidence_score                | numeric
 public       | chat_session_analyses      | created_at                      | timestamp with time zone
 public       | chat_sessions              | id                              | uuid
 public       | chat_sessions              | user_id                         | uuid
 public       | chat_sessions              | session_id                      | character varying
 public       | chat_sessions              | title                           | character varying
 public       | chat_sessions              | is_active                       | boolean
 public       | chat_sessions              | created_at                      | timestamp with time zone
 public       | chat_sessions              | updated_at                      | timestamp with time zone
 public       | chat_sessions              | intent_detected                 | text
 public       | chat_sessions              | summary                         | text
 public       | chat_sessions              | follow_up_required              | boolean
 public       | collectible_assets         | id                              | uuid
 public       | collectible_assets         | manual_asset_id                 | uuid
 public       | collectible_assets         | category                        | text
 public       | collectible_assets         | description                     | text
 public       | collectible_assets         | acquisition_date                | date
 public       | collectible_assets         | acquisition_cost                | numeric
 public       | collectible_assets         | estimated_value                 | numeric
 public       | collectible_assets         | appraisal_date                  | date
 public       | collectible_assets         | created_at                      | timestamp with time zone
 public       | collectible_assets         | updated_at                      | timestamp with time zone
 public       | collectible_assets         | name                            | text
 public       | collectible_assets         | asset_class                     | text
 public       | collectible_assets         | value                           | numeric
 public       | collectible_details        | id                              | uuid
 public       | collectible_details        | manual_asset_id                 | uuid
 public       | collectible_details        | category                        | text
 public       | collectible_details        | description                     | text
 public       | collectible_details        | acquisition_date                | date
 public       | collectible_details        | acquisition_cost                | numeric
 public       | collectible_details        | estimated_value                 | numeric
 public       | collectible_details        | appraisal_date                  | date
 public       | collectible_details        | created_at                      | timestamp with time zone
 public       | collectible_details        | updated_at                      | timestamp with time zone
 public       | collectible_details        | appreciation_rate               | numeric
 public       | contribution_schedule      | id                              | uuid
 public       | contribution_schedule      | account_id                      | uuid
 public       | contribution_schedule      | user_id                         | uuid
 public       | contribution_schedule      | monthly_amount                  | numeric
 public       | contribution_schedule      | employer_match                  | numeric
 public       | contribution_schedule      | frequency                       | USER-DEFINED
 public       | credit_card_details        | account_id                      | uuid
 public       | credit_card_details        | purchase_apr_percentage         | numeric
 public       | credit_card_details        | cash_advance_apr_percentage     | numeric
 public       | credit_card_details        | balance_transfer_apr_percentage | numeric
 public       | credit_card_details        | minimum_payment_amount          | numeric
 public       | credit_card_details        | last_statement_balance          | numeric
 public       | credit_card_details        | next_payment_due_date           | date
 public       | credit_card_details        | last_payment_date               | date
 public       | credit_card_details        | last_payment_amount             | numeric
 public       | credit_card_details        | is_overdue                      | boolean
 public       | credit_card_details        | created_at                      | timestamp with time zone
 public       | credit_card_details        | updated_at                      | timestamp with time zone
 public       | currency_conversions       | id                              | integer
 public       | currency_conversions       | from_currency                   | text
 public       | currency_conversions       | to_currency                     | text
 public       | currency_conversions       | rate                            | numeric
 public       | currency_conversions       | timestamp                       | timestamp with time zone
 public       | estate_docs                | id                              | uuid
 public       | estate_docs                | user_id                         | uuid
 public       | estate_docs                | type                            | character varying
 public       | estate_docs                | name                            | character varying
 public       | estate_docs                | description                     | text
 public       | estate_docs                | file_path                       | character varying
 public       | estate_docs                | created_date                    | timestamp with time zone
 public       | estate_docs                | last_updated                    | timestamp with time zone
 public       | estate_docs                | is_active                       | boolean
 public       | estate_docs                | created_at                      | timestamp with time zone
 public       | estate_docs                | updated_at                      | timestamp with time zone
 public       | feature_usage              | id                              | integer
 public       | feature_usage              | user_id                         | uuid
 public       | feature_usage              | feature_name                    | text
 public       | feature_usage              | used_at                         | timestamp with time zone
 public       | financial_insights         | id                              | uuid
 public       | financial_insights         | user_id                         | uuid
 public       | financial_insights         | insight_type                    | character varying
 public       | financial_insights         | title                           | character varying
 public       | financial_insights         | description                     | text
 public       | financial_insights         | severity                        | character varying
 public       | financial_insights         | data                            | jsonb
 public       | financial_insights         | is_read                         | boolean
 public       | financial_insights         | expires_at                      | timestamp with time zone
 public       | financial_insights         | created_at                      | timestamp with time zone
 public       | goal_scenarios             | id                              | integer
 public       | goal_scenarios             | user_id                         | uuid
 public       | goal_scenarios             | scenario_name                   | text
 public       | goal_scenarios             | assumptions                     | jsonb
 public       | goal_scenarios             | ai_generated                    | boolean
 public       | goal_scenarios             | created_at                      | timestamp with time zone
 public       | goals                      | id                              | uuid
 public       | goals                      | user_id                         | uuid
 public       | goals                      | name                            | character varying
 public       | goals                      | description                     | text
 public       | goals                      | target_amount                   | numeric
 public       | goals                      | current_amount                  | numeric
 public       | goals                      | target_date                     | timestamp with time zone
 public       | goals                      | priority                        | character varying
 public       | goals                      | is_active                       | boolean
 public       | goals                      | created_at                      | timestamp with time zone
 public       | goals                      | updated_at                      | timestamp with time zone
 public       | holdings                   | id                              | uuid
 public       | holdings                   | account_id                      | uuid
 public       | holdings                   | security_id                     | uuid
 public       | holdings                   | quantity                        | numeric
 public       | holdings                   | cost_basis                      | numeric
 public       | holdings                   | institution_price               | numeric
 public       | holdings                   | institution_value               | numeric
 public       | holdings                   | last_price_date                 | date
 public       | holdings                   | created_at                      | timestamp with time zone
 public       | holdings                   | updated_at                      | timestamp with time zone
 public       | institutions               | id                              | uuid
 public       | institutions               | plaid_institution_id            | text
 public       | institutions               | name                            | text
 public       | institutions               | country_code                    | character
 public       | institutions               | created_at                      | timestamp with time zone
 public       | insurances                 | id                              | uuid
 public       | insurances                 | user_id                         | uuid
 public       | insurances                 | type                            | character varying
 public       | insurances                 | provider                        | character varying
 public       | insurances                 | policy_number                   | character varying
 public       | insurances                 | premium_amount                  | numeric
 public       | insurances                 | coverage_amount                 | numeric
 public       | insurances                 | start_date                      | timestamp with time zone
 public       | insurances                 | end_date                        | timestamp with time zone
 public       | insurances                 | is_active                       | boolean
 public       | insurances                 | created_at                      | timestamp with time zone
 public       | insurances                 | updated_at                      | timestamp with time zone
 public       | loan_details               | account_id                      | uuid
 public       | loan_details               | interest_rate                   | numeric
 public       | loan_details               | origination_principal           | numeric
 public       | loan_details               | origination_date                | date
 public       | loan_details               | maturity_date                   | date
 public       | loan_details               | next_payment_due                | date
 public       | loan_details               | next_payment_amount             | numeric
 public       | loan_details               | last_payment_date               | date
 public       | loan_details               | last_payment_amount             | numeric
 public       | loan_details               | created_at                      | timestamp with time zone
 public       | loan_details               | updated_at                      | timestamp with time zone
 public       | loan_details               | payment_frequency               | text
 public       | loan_details               | extra_monthly_payment           | numeric
 public       | loan_details               | refinance_date                  | date
 public       | loan_details               | rate_type                       | text
 public       | loan_details               | balloon_amount                  | numeric
 public       | loan_details               | prepayment_penalty_flag         | boolean
 public       | manual_assets              | id                              | uuid
 public       | manual_assets              | user_id                         | uuid
 public       | manual_assets              | name                            | text
 public       | manual_assets              | asset_class                     | text
 public       | manual_assets              | value                           | numeric
 public       | manual_assets              | notes                           | text
 public       | manual_assets              | created_at                      | timestamp with time zone
 public       | manual_assets              | updated_at                      | timestamp with time zone
 public       | manual_assets              | purchase_price                  | numeric
 public       | manual_assets              | purchase_date                   | date
 public       | manual_assets              | planned_sell_date               | date
 public       | manual_assets              | cost_basis                      | numeric
 public       | manual_liabilities         | id                              | uuid
 public       | manual_liabilities         | user_id                         | uuid
 public       | manual_liabilities         | name                            | text
 public       | manual_liabilities         | liability_class                 | text
 public       | manual_liabilities         | balance                         | numeric
 public       | manual_liabilities         | interest_rate                   | numeric
 public       | manual_liabilities         | notes                           | text
 public       | manual_liabilities         | created_at                      | timestamp with time zone
 public       | manual_liabilities         | updated_at                      | timestamp with time zone
 public       | marketing_form_submissions | id                              | integer
 public       | marketing_form_submissions | user_id                         | uuid
 public       | marketing_form_submissions | form_data                       | jsonb
 public       | marketing_form_submissions | submitted_at                    | timestamp with time zone
 public       | memory_capture_requests    | id                              | integer
 public       | memory_capture_requests    | user_id                         | uuid
 public       | memory_capture_requests    | note                            | text
 public       | memory_capture_requests    | should_remember                 | boolean
 public       | memory_capture_requests    | created_at                      | timestamp with time zone
 public       | message_embeddings         | id                              | integer
 public       | message_embeddings         | message_id                      | uuid
 public       | message_embeddings         | embedding                       | USER-DEFINED
 public       | message_embeddings         | created_at                      | timestamp with time zone
 public       | mortgage_details           | account_id                      | uuid
 public       | mortgage_details           | escrow_balance                  | numeric
 public       | mortgage_details           | has_pmi                         | boolean
 public       | mortgage_details           | property_address_street         | text
 public       | mortgage_details           | property_address_city           | text
 public       | mortgage_details           | property_address_region         | text
 public       | mortgage_details           | property_address_postal         | text
 public       | mortgage_details           | property_address_country        | character
 public       | mortgage_details           | ytd_interest_paid               | numeric
 public       | mortgage_details           | ytd_principal_paid              | numeric
 public       | mortgage_details           | created_at                      | timestamp with time zone
 public       | mortgage_details           | updated_at                      | timestamp with time zone
 public       | notification_preferences   | id                              | integer
 public       | notification_preferences   | user_id                         | uuid
 public       | notification_preferences   | notification_type               | text
 public       | notification_preferences   | enabled                         | boolean
 public       | notification_preferences   | channel                         | text
 public       | notification_preferences   | created_at                      | timestamp with time zone
 public       | nps_scores                 | id                              | integer
 public       | nps_scores                 | user_id                         | uuid
 public       | nps_scores                 | score                           | integer
 public       | nps_scores                 | submitted_at                    | timestamp with time zone
 public       | onboarding_progress        | id                              | integer
 public       | onboarding_progress        | user_id                         | uuid
 public       | onboarding_progress        | current_step                    | text
 public       | onboarding_progress        | is_complete                     | boolean
 public       | onboarding_progress        | updated_at                      | timestamp with time zone
 public       | other_assets               | id                              | uuid
 public       | other_assets               | manual_asset_id                 | uuid
 public       | other_assets               | description                     | text
 public       | other_assets               | category                        | text
 public       | other_assets               | acquisition_date                | date
 public       | other_assets               | acquisition_cost                | numeric
 public       | other_assets               | estimated_value                 | numeric
 public       | other_assets               | notes                           | text
 public       | other_assets               | created_at                      | timestamp with time zone
 public       | other_assets               | updated_at                      | timestamp with time zone
 public       | other_assets               | name                            | text
 public       | other_assets               | asset_class                     | text
 public       | other_assets               | value                           | numeric
 public       | other_manual_asset_details | id                              | uuid
 public       | other_manual_asset_details | manual_asset_id                 | uuid
 public       | other_manual_asset_details | description                     | text
 public       | other_manual_asset_details | category                        | text
 public       | other_manual_asset_details | acquisition_date                | date
 public       | other_manual_asset_details | acquisition_cost                | numeric
 public       | other_manual_asset_details | estimated_value                 | numeric
 public       | other_manual_asset_details | notes                           | text
 public       | other_manual_asset_details | created_at                      | timestamp with time zone
 public       | other_manual_asset_details | updated_at                      | timestamp with time zone
 public       | other_manual_assets        | id                              | uuid
 public       | other_manual_assets        | manual_asset_id                 | uuid
 public       | other_manual_assets        | description                     | text
 public       | other_manual_assets        | category                        | text
 public       | other_manual_assets        | acquisition_cost                | numeric
 public       | other_manual_assets        | estimated_value                 | numeric
 public       | other_manual_assets        | acquisition_date                | date
 public       | other_manual_assets        | valuation_date                  | date
 public       | other_manual_assets        | created_at                      | timestamp with time zone
 public       | other_manual_assets        | updated_at                      | timestamp with time zone
 public       | plaid_account_taxonomy     | type                            | text
 public       | plaid_account_taxonomy     | subtype                         | text
 public       | plaid_connections          | id                              | uuid
 public       | plaid_connections          | user_id                         | uuid
 public       | plaid_connections          | plaid_access_token              | character varying
 public       | plaid_connections          | plaid_item_id                   | character varying
 public       | plaid_connections          | plaid_institution_id_text       | character varying
 public       | plaid_connections          | is_active                       | boolean
 public       | plaid_connections          | last_sync_at                    | timestamp with time zone
 public       | plaid_connections          | created_at                      | timestamp with time zone
 public       | plaid_connections          | updated_at                      | timestamp with time zone
 public       | plaid_connections          | institution_id                  | uuid
 public       | plaid_connections          | institution_name                | text
 public       | real_estate_details        | id                              | uuid
 public       | real_estate_details        | manual_asset_id                 | uuid
 public       | real_estate_details        | address                         | text
 public       | real_estate_details        | property_type                   | text
 public       | real_estate_details        | is_primary_residence            | boolean
 public       | real_estate_details        | purchase_price                  | numeric
 public       | real_estate_details        | purchase_date                   | date
 public       | real_estate_details        | market_value                    | numeric
 public       | real_estate_details        | valuation_date                  | date
 public       | real_estate_details        | appreciation_rate               | numeric
 public       | real_estate_details        | property_tax_rate               | numeric
 public       | real_estate_details        | annual_maintenance              | numeric
 public       | real_estate_details        | mortgage_account_id             | uuid
 public       | real_estate_details        | created_at                      | timestamp with time zone
 public       | real_estate_details        | updated_at                      | timestamp with time zone
 public       | real_estate_details        | gross_monthly_rent              | numeric
 public       | real_estate_details        | other_income_annual             | numeric
 public       | real_estate_details        | vacancy_pct                     | numeric
 public       | real_estate_details        | property_mgmt_pct               | numeric
 public       | real_estate_details        | insurance_annual                | numeric
 public       | real_estate_details        | hoa_annual                      | numeric
 public       | real_estate_details        | utilities_owner_annual          | numeric
 public       | real_estate_details        | capex_reserve_pct               | numeric
 public       | real_estate_details        | planned_sell_date               | date
 public       | recurring_income           | id                              | uuid
 public       | recurring_income           | user_id                         | uuid
 public       | recurring_income           | source                          | text
 public       | recurring_income           | gross_monthly                   | numeric
 public       | recurring_income           | next_pay_date                   | date
 public       | recurring_income           | inflation_adj                   | boolean
 public       | securities                 | id                              | uuid
 public       | securities                 | name                            | text
 public       | securities                 | ticker                          | text
 public       | securities                 | security_type                   | text
 public       | securities                 | cusip                           | text
 public       | securities                 | isin                            | text
 public       | securities                 | currency                        | character
 public       | securities                 | created_at                      | timestamp with time zone
 public       | security_questions         | id                              | integer
 public       | security_questions         | user_id                         | uuid
 public       | security_questions         | question                        | text
 public       | security_questions         | answer_hash                     | text
 public       | security_questions         | created_at                      | timestamp with time zone
 public       | student_loan_details       | account_id                      | uuid
 public       | student_loan_details       | deferment_status_type           | text
 public       | student_loan_details       | repayment_plan_type             | text
 public       | student_loan_details       | expected_payoff_date            | date
 public       | student_loan_details       | is_overdue                      | boolean
 public       | student_loan_details       | outstanding_interest_amt        | numeric
 public       | student_loan_details       | minimum_payment_amount          | numeric
 public       | student_loan_details       | last_payment_date               | date
 public       | student_loan_details       | last_payment_amount             | numeric
 public       | student_loan_details       | created_at                      | timestamp with time zone
 public       | student_loan_details       | updated_at                      | timestamp with time zone
 public       | tax_profile                | user_id                         | uuid
 public       | tax_profile                | filing_status                   | text
 public       | tax_profile                | state                           | character
 public       | tax_profile                | federal_rate                    | numeric
 public       | tax_profile                | state_rate                      | numeric
 public       | transactions               | id                              | uuid
 public       | transactions               | user_id                         | uuid
 public       | transactions               | account_id                      | uuid
 public       | transactions               | plaid_transaction_id            | character varying
 public       | transactions               | amount                          | double precision
 public       | transactions               | currency_code                   | character varying
 public       | transactions               | date                            | timestamp with time zone
 public       | transactions               | name                            | character varying
 public       | transactions               | merchant_name                   | character varying
 public       | transactions               | category                        | character varying
 public       | transactions               | category_id                     | character varying
 public       | transactions               | pending                         | boolean
 public       | transactions               | payment_channel                 | character varying
 public       | transactions               | transaction_type                | character varying
 public       | transactions               | location                        | jsonb
 public       | transactions               | payment_meta                    | jsonb
 public       | transactions               | created_at                      | timestamp with time zone
 public       | transactions               | pfc_primary                     | text
 public       | transactions               | pfc_detailed                    | text
 public       | user_appearance_settings   | id                              | integer
 public       | user_appearance_settings   | user_id                         | uuid
 public       | user_appearance_settings   | theme                           | text
 public       | user_appearance_settings   | font_size                       | text
 public       | user_appearance_settings   | contrast_mode                   | boolean
 public       | user_appearance_settings   | created_at                      | timestamp with time zone
 public       | user_behavior_log          | id                              | integer
 public       | user_behavior_log          | user_id                         | uuid
 public       | user_behavior_log          | action                          | text
 public       | user_behavior_log          | metadata                        | jsonb
 public       | user_behavior_log          | occurred_at                     | timestamp with time zone
 public       | user_dashboard_state       | id                              | integer
 public       | user_dashboard_state       | user_id                         | uuid
 public       | user_dashboard_state       | widgets                         | jsonb
 public       | user_dashboard_state       | last_modified                   | timestamp with time zone
 public       | user_demographics          | id                              | integer
 public       | user_demographics          | user_id                         | uuid
 public       | user_demographics          | age                             | integer
 public       | user_demographics          | household_income                | numeric
 public       | user_demographics          | marital_status                  | text
 public       | user_demographics          | dependents                      | integer
 public       | user_demographics          | created_at                      | timestamp with time zone
 public       | user_feedback              | id                              | integer
 public       | user_feedback              | user_id                         | uuid
 public       | user_feedback              | feedback                        | text
 public       | user_feedback              | sentiment                       | text
 public       | user_feedback              | created_at                      | timestamp with time zone
 public       | user_identity              | user_id                         | uuid
 public       | user_identity              | full_name                       | text
 public       | user_identity              | phone_primary                   | text
 public       | user_identity              | email_primary                   | text
 public       | user_identity              | street                          | text
 public       | user_identity              | city                            | text
 public       | user_identity              | state                           | text
 public       | user_identity              | postal_code                     | text
 public       | user_identity              | created_at                      | timestamp with time zone
 public       | user_identity              | updated_at                      | timestamp with time zone
 public       | user_memory_log            | id                              | integer
 public       | user_memory_log            | user_id                         | uuid
 public       | user_memory_log            | memory                          | text
 public       | user_memory_log            | created_at                      | timestamp with time zone
 public       | user_onboarding_responses  | id                              | integer
 public       | user_onboarding_responses  | user_id                         | uuid
 public       | user_onboarding_responses  | question                        | text
 public       | user_onboarding_responses  | answer                          | text
 public       | user_onboarding_responses  | created_at                      | timestamp with time zone
 public       | user_preferences           | id                              | uuid
 public       | user_preferences           | user_id                         | uuid
 public       | user_preferences           | theme                           | character varying
 public       | user_preferences           | notifications_enabled           | boolean
 public       | user_preferences           | email_notifications             | boolean
 public       | user_preferences           | push_notifications              | boolean
 public       | user_preferences           | currency                        | character varying
 public       | user_preferences           | timezone                        | character varying
 public       | user_preferences           | language                        | character varying
 public       | user_preferences           | financial_goals                 | jsonb
 public       | user_preferences           | risk_tolerance                  | character varying
 public       | user_preferences           | investment_horizon              | character varying
 public       | user_preferences           | created_at                      | timestamp with time zone
 public       | user_preferences           | updated_at                      | timestamp with time zone
 public       | user_privacy_settings      | id                              | integer
 public       | user_privacy_settings      | user_id                         | uuid
 public       | user_privacy_settings      | allow_data_sharing              | boolean
 public       | user_privacy_settings      | show_profile_publicly           | boolean
 public       | user_privacy_settings      | created_at                      | timestamp with time zone
 public       | user_profiles              | id                              | integer
 public       | user_profiles              | user_id                         | uuid
 public       | user_profiles              | personality_type                | text
 public       | user_profiles              | financial_literacy_level        | text
 public       | user_profiles              | goals                           | ARRAY
 public       | user_profiles              | created_at                      | timestamp with time zone
 public       | user_requests              | id                              | integer
 public       | user_requests              | user_id                         | uuid
 public       | user_requests              | command                         | text
 public       | user_requests              | created_at                      | timestamp with time zone
 public       | users                      | id                              | uuid
 public       | users                      | email                           | character varying
 public       | users                      | first_name                      | character varying
 public       | users                      | last_name                       | character varying
 public       | users                      | password_hash                   | character varying
 public       | users                      | is_active                       | boolean
 public       | users                      | is_advisor                      | boolean
 public       | users                      | created_at                      | timestamp with time zone
 public       | users                      | updated_at                      | timestamp with time zone
 public       | users                      | communication_style             | text
 public       | users                      | coaching_style                  | text
 public       | users                      | ai_personality_preference       | text
 public       | users                      | emergency_contact_name          | text
 public       | users                      | emergency_contact_phone         | text
 public       | users                      | emergency_contact_relationship  | text
 public       | users                      | preferred_contact_method        | text
 public       | users                      | communication_frequency         | text
 public       | users                      | currency_preference             | text
 public       | users                      | health_integration_consent      | boolean
 public       | users                      | biometric_auth_enabled          | boolean
 public       | users                      | two_factor_auth_enabled         | boolean
 public       | users                      | account_creation_source         | text
 public       | users                      | marketing_consent_date          | timestamp without time zone
 public       | v_business_assets          | user_id                         | uuid
 public       | v_business_assets          | manual_asset_id                 | uuid
 public       | v_business_assets          | manual_asset_name               | text
 public       | v_business_assets          | manual_asset_value              | numeric
 public       | v_business_assets          | business_name                   | text
 public       | v_business_assets          | ownership_percentage            | numeric
 public       | v_business_assets          | valuation                       | numeric
 public       | v_business_assets          | ownership_value                 | numeric
 public       | v_business_assets          | annual_income                   | numeric
 public       | v_business_assets          | acquisition_date                | date
 public       | v_business_assets          | created_at                      | timestamp with time zone
 public       | v_business_assets          | updated_at                      | timestamp with time zone
 public       | v_collectible_assets       | user_id                         | uuid
 public       | v_collectible_assets       | manual_asset_id                 | uuid
 public       | v_collectible_assets       | manual_asset_name               | text
 public       | v_collectible_assets       | asset_class                     | text
 public       | v_collectible_assets       | manual_asset_value              | numeric
 public       | v_collectible_assets       | category                        | text
 public       | v_collectible_assets       | collectible_description         | text
 public       | v_collectible_assets       | acquisition_date                | date
 public       | v_collectible_assets       | acquisition_cost                | numeric
 public       | v_collectible_assets       | estimated_value                 | numeric
 public       | v_collectible_assets       | appraisal_date                  | date
 public       | v_collectible_assets       | created_at                      | timestamp with time zone
 public       | v_collectible_assets       | updated_at                      | timestamp with time zone
 public       | v_contribution_schedule    | id                              | uuid
 public       | v_contribution_schedule    | user_id                         | uuid
 public       | v_contribution_schedule    | account_id                      | uuid
 public       | v_contribution_schedule    | account_name                    | character varying
 public       | v_contribution_schedule    | monthly_amount                  | numeric
 public       | v_contribution_schedule    | employer_match                  | numeric
 public       | v_contribution_schedule    | frequency                       | text
 public       | v_other_assets             | user_id                         | uuid
 public       | v_other_assets             | manual_asset_id                 | uuid
 public       | v_other_assets             | manual_asset_name               | text
 public       | v_other_assets             | asset_class                     | text
 public       | v_other_assets             | manual_asset_value              | numeric
 public       | v_other_assets             | description                     | text
 public       | v_other_assets             | category                        | text
 public       | v_other_assets             | acquisition_date                | date
 public       | v_other_assets             | acquisition_cost                | numeric
 public       | v_other_assets             | estimated_value                 | numeric
 public       | v_other_assets             | valuation_date                  | date
 public       | v_other_assets             | notes                           | text
 public       | v_other_assets             | updated_at                      | timestamp with time zone
 public       | v_real_estate_assets       | user_id                         | uuid
 public       | v_real_estate_assets       | manual_asset_id                 | uuid
 public       | v_real_estate_assets       | manual_asset_name               | text
 public       | v_real_estate_assets       | asset_class                     | text
 public       | v_real_estate_assets       | manual_asset_value              | numeric
 public       | v_real_estate_assets       | address                         | text
 public       | v_real_estate_assets       | property_type                   | text
 public       | v_real_estate_assets       | is_primary_residence            | boolean
 public       | v_real_estate_assets       | purchase_price                  | numeric
 public       | v_real_estate_assets       | purchase_date                   | date
 public       | v_real_estate_assets       | market_value                    | numeric
 public       | v_real_estate_assets       | valuation_date                  | date
 public       | v_real_estate_assets       | appreciation_rate               | numeric
 public       | v_real_estate_assets       | property_tax_rate               | numeric
 public       | v_real_estate_assets       | annual_maintenance              | numeric
 public       | v_real_estate_assets       | mortgage_account_id             | uuid
 public       | v_real_estate_assets       | created_at                      | timestamp with time zone
 public       | v_real_estate_assets       | updated_at                      | timestamp with time zone
 public       | v_real_estate_cashflow     | re_id                           | uuid
 public       | v_real_estate_cashflow     | manual_asset_id                 | uuid
 public       | v_real_estate_cashflow     | property_name                   | text
 public       | v_real_estate_cashflow     | market_value                    | numeric
 public       | v_real_estate_cashflow     | purchase_price                  | numeric
 public       | v_real_estate_cashflow     | gross_monthly_rent              | numeric
 public       | v_real_estate_cashflow     | other_inc                       | numeric
 public       | v_real_estate_cashflow     | vacancy_pct                     | numeric
 public       | v_real_estate_cashflow     | property_mgmt_pct               | numeric
 public       | v_real_estate_cashflow     | noi_annual                      | numeric
 public       | v_real_estate_cashflow     | noi_monthly                     | numeric
 public       | v_real_estate_cashflow     | debt_balance                    | numeric
 public       | v_real_estate_cashflow     | debt_monthly_payment            | numeric
 public       | v_real_estate_cashflow     | cashflow_annual_after_debt      | numeric
 public       | v_real_estate_cashflow     | cashflow_monthly_after_debt     | numeric
 public       | v_real_estate_cashflow     | cap_rate_pct                    | numeric
 public       | v_real_estate_cashflow     | ltv_pct                         | numeric
 public       | v_tax_profile              | user_id                         | uuid
 public       | v_tax_profile              | filing_status                   | text
 public       | v_tax_profile              | state                           | character
 public       | v_tax_profile              | federal_rate                    | numeric
 public       | v_tax_profile              | state_rate                      | numeric
 public       | v_tax_profile              | federal_rate_fmt                | text
 public       | v_tax_profile              | state_rate_fmt                  | text
 public       | v_user_institutions        | user_id                         | uuid
 public       | v_user_institutions        | institutions_count              | bigint
 public       | v_vehicle_assets           | user_id                         | uuid
 public       | v_vehicle_assets           | manual_asset_id                 | uuid
 public       | v_vehicle_assets           | manual_asset_name               | text
 public       | v_vehicle_assets           | asset_class                     | text
 public       | v_vehicle_assets           | manual_asset_value              | numeric
 public       | v_vehicle_assets           | vin                             | text
 public       | v_vehicle_assets           | make                            | text
 public       | v_vehicle_assets           | model                           | text
 public       | v_vehicle_assets           | year                            | integer
 public       | v_vehicle_assets           | mileage                         | numeric
 public       | v_vehicle_assets           | purchase_price                  | numeric
 public       | v_vehicle_assets           | purchase_date                   | date
 public       | v_vehicle_assets           | estimated_value                 | numeric
 public       | v_vehicle_assets           | loan_account_id                 | uuid
 public       | v_vehicle_assets           | created_at                      | timestamp with time zone
 public       | v_vehicle_assets           | updated_at                      | timestamp with time zone
 public       | vehicle_assets             | id                              | uuid
 public       | vehicle_assets             | manual_asset_id                 | uuid
 public       | vehicle_assets             | make                            | text
 public       | vehicle_assets             | model                           | text
 public       | vehicle_assets             | year                            | integer
 public       | vehicle_assets             | vin                             | text
 public       | vehicle_assets             | purchase_price                  | numeric
 public       | vehicle_assets             | purchase_date                   | date
 public       | vehicle_assets             | mileage                         | integer
 public       | vehicle_assets             | estimated_value                 | numeric
 public       | vehicle_assets             | valuation_date                  | date
 public       | vehicle_assets             | created_at                      | timestamp with time zone
 public       | vehicle_assets             | updated_at                      | timestamp with time zone
 public       | vehicle_details            | id                              | uuid
 public       | vehicle_details            | manual_asset_id                 | uuid
 public       | vehicle_details            | vin                             | text
 public       | vehicle_details            | make                            | text
 public       | vehicle_details            | model                           | text
 public       | vehicle_details            | year                            | integer
 public       | vehicle_details            | mileage                         | numeric
 public       | vehicle_details            | purchase_price                  | numeric
 public       | vehicle_details            | purchase_date                   | date
 public       | vehicle_details            | estimated_value                 | numeric
 public       | vehicle_details            | loan_account_id                 | uuid
 public       | vehicle_details            | created_at                      | timestamp with time zone
 public       | vehicle_details            | updated_at                      | timestamp with time zone
 public       | waitlist_users             | id                              | integer
 public       | waitlist_users             | email                           | text
 public       | waitlist_users             | referral_code                   | text
 public       | waitlist_users             | utm_source                      | text
 public       | waitlist_users             | created_at                      | timestamp with time zone