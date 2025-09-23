# TRUEFIBACKEND/profile_pack/comprehensive_schema.py
# Comprehensive schema that exposes ALL database tables for complete data access

from typing import Dict, Any

class ComprehensiveSchemaCard:
    """Complete schema card exposing all database tables as documented in database.md"""

    @staticmethod
    def get_liability_tables() -> Dict[str, Any]:
        """Get liability-related table schemas"""
        return {
            "loan_details": {
                "description": "Detailed loan information",
                "columns": {
                    "account_id": "uuid",
                    "interest_rate": "numeric",
                    "origination_principal": "numeric",
                    "origination_date": "date",
                    "maturity_date": "date",
                    "next_payment_due": "date",
                    "next_payment_amount": "numeric",
                    "minimum_payment_amount": "numeric",
                    "ytd_interest_paid": "numeric",
                    "ytd_principal_paid": "numeric",
                    "is_overdue": "boolean",
                    "past_due_amount": "numeric"
                },
                "use_for": ["loan details", "payment schedules", "interest tracking"]
            },
            "student_loan_details": {
                "description": "Student loan specific information",
                "columns": {
                    "account_id": "uuid",
                    "loan_name": "text",
                    "loan_status_type": "text",
                    "expected_payoff_date": "date",
                    "interest_rate_percentage": "numeric",
                    "repayment_plan_type": "text",
                    "pslf_payments_made": "integer",
                    "pslf_payments_remaining": "integer"
                },
                "use_for": ["student loans", "PSLF tracking", "education debt"]
            },
            "mortgage_details": {
                "description": "Mortgage loan information",
                "columns": {
                    "account_id": "uuid",
                    "loan_type": "text",
                    "property_address": "text",
                    "origination_principal": "numeric",
                    "origination_date": "date",
                    "maturity_date": "date",
                    "interest_rate": "numeric",
                    "interest_rate_type": "text",
                    "escrow_balance": "numeric",
                    "pmi_amount": "numeric"
                },
                "use_for": ["mortgage", "home loans", "property debt"]
            },
            "credit_card_aprs": {
                "description": "Credit card interest rates",
                "columns": {
                    "account_id": "uuid",
                    "apr_type": "text",
                    "apr_percentage": "numeric",
                    "balance_subject_to_apr": "numeric",
                    "interest_charge_amount": "numeric"
                },
                "use_for": ["credit card interest", "APR tracking", "interest charges"]
            }
        }

    @staticmethod
    def get_asset_detail_tables() -> Dict[str, Any]:
        """Get detailed asset table schemas"""
        return {
            "real_estate_details": {
                "description": "Real estate property details",
                "columns": {
                    "manual_asset_id": "uuid",
                    "address": "text",
                    "property_type": "text",
                    "is_primary_residence": "boolean",
                    "purchase_price": "numeric",
                    "purchase_date": "date",
                    "market_value": "numeric",
                    "valuation_date": "date",
                    "appreciation_rate": "numeric",
                    "property_tax_rate": "numeric",
                    "annual_maintenance": "numeric",
                    "gross_monthly_rent": "numeric",
                    "mortgage_account_id": "uuid"
                },
                "use_for": ["real estate", "property", "home value", "rental income"]
            },
            "vehicle_assets": {
                "description": "Vehicle asset details",
                "columns": {
                    "asset_id": "uuid",
                    "make": "text",
                    "model": "text",
                    "year": "integer",
                    "vin": "text",
                    "purchase_price": "numeric",
                    "purchase_date": "date",
                    "mileage": "integer",
                    "loan_account_id": "uuid"
                },
                "use_for": ["vehicles", "cars", "auto assets"]
            },
            "business_ownership_details": {
                "description": "Business ownership information",
                "columns": {
                    "manual_asset_id": "uuid",
                    "business_name": "text",
                    "ownership_percentage": "numeric",
                    "valuation": "numeric",
                    "annual_income": "numeric",
                    "acquisition_date": "date"
                },
                "use_for": ["business ownership", "business assets", "business income"]
            },
            "collectible_details": {
                "description": "Collectible asset information",
                "columns": {
                    "manual_asset_id": "uuid",
                    "category": "text",
                    "description": "text",
                    "acquisition_date": "date",
                    "acquisition_cost": "numeric",
                    "estimated_value": "numeric",
                    "appraisal_date": "date"
                },
                "use_for": ["collectibles", "art", "valuables", "collections"]
            }
        }

    @staticmethod
    def get_income_insurance_tables() -> Dict[str, Any]:
        """Get income and insurance table schemas"""
        return {
            "recurring_income": {
                "description": "Recurring income sources",
                "columns": {
                    "id": "uuid",
                    "user_id": "uuid",
                    "source": "text",
                    "gross_monthly": "numeric",
                    "frequency": "text",
                    "next_pay_date": "date",
                    "is_taxable": "boolean",
                    "withholding_rate": "numeric",
                    "effective_from": "date",
                    "effective_to": "date"
                },
                "use_for": ["income", "salary", "recurring income", "paychecks"]
            },
            "insurances": {
                "description": "Insurance policies",
                "columns": {
                    "id": "uuid",
                    "user_id": "uuid",
                    "type": "text",
                    "provider": "text",
                    "policy_number": "text",
                    "coverage_amount": "numeric",
                    "premium": "numeric",
                    "frequency": "text",
                    "deductible": "numeric",
                    "effective_date": "date",
                    "expiration_date": "date",
                    "is_active": "boolean"
                },
                "use_for": ["insurance", "coverage", "policies", "premiums"]
            },
            "contribution_schedule": {
                "description": "Retirement contribution schedules",
                "columns": {
                    "id": "uuid",
                    "account_id": "uuid",
                    "user_id": "uuid",
                    "monthly_amount": "numeric",
                    "employer_match": "numeric"
                },
                "use_for": ["401k contributions", "retirement contributions", "employer match"]
            }
        }

    @staticmethod
    def get_investment_tables() -> Dict[str, Any]:
        """Get investment-related table schemas"""
        return {
            "investment_transactions": {
                "description": "Investment trading history",
                "columns": {
                    "id": "uuid",
                    "account_id": "uuid",
                    "security_id": "uuid",
                    "date": "date",
                    "name": "text",
                    "type": "text",
                    "subtype": "text",
                    "amount": "numeric",
                    "quantity": "numeric",
                    "price": "numeric",
                    "fees": "numeric"
                },
                "use_for": ["trades", "investment transactions", "buy/sell history", "trading activity"]
            },
            "asset_valuations": {
                "description": "Historical asset valuations",
                "columns": {
                    "asset_id": "uuid",
                    "as_of_date": "date",
                    "value": "numeric",
                    "method": "text",
                    "source": "text"
                },
                "use_for": ["valuation history", "asset appreciation", "value tracking"]
            }
        }

    @staticmethod
    def get_estate_planning_tables() -> Dict[str, Any]:
        """Get estate planning table schemas"""
        return {
            "estate_docs": {
                "description": "Estate planning documents",
                "columns": {
                    "id": "uuid",
                    "user_id": "uuid",
                    "type": "text",
                    "name": "text",
                    "description": "text",
                    "created_date": "date",
                    "last_updated": "date",
                    "is_active": "boolean"
                },
                "use_for": ["estate planning", "wills", "trusts", "beneficiaries"]
            }
        }

    @staticmethod
    def get_all_additional_tables() -> Dict[str, Any]:
        """Get all additional tables not in the basic schema"""
        tables = {}
        tables.update(ComprehensiveSchemaCard.get_liability_tables())
        tables.update(ComprehensiveSchemaCard.get_asset_detail_tables())
        tables.update(ComprehensiveSchemaCard.get_income_insurance_tables())
        tables.update(ComprehensiveSchemaCard.get_investment_tables())
        tables.update(ComprehensiveSchemaCard.get_estate_planning_tables())
        return tables