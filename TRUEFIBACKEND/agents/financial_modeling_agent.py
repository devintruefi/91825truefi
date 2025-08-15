"""
Financial Modeling Agent - GPT-5 powered, pure LLM intelligence
"""
import time
import json
import logging
import uuid
from typing import Dict, Any
from datetime import datetime
from decimal import Decimal
from .base_agent import BaseAgent
from .utils.observability import (
    ObservabilityContext, json_log, 
    validate_dti, validate_housing_costs, 
    check_liquid_vs_retirement, check_anomalous_budgets
)

logger = logging.getLogger(__name__)

class FinancialModelingAgent(BaseAgent):
    """
    GPT-5 powered financial modeling - the LLM handles everything.
    No formulas, no calculations in code, pure AI intelligence.
    """
    
    def __init__(self, openai_client, db_pool, sql_agent=None):
        super().__init__(openai_client, db_pool)
        self.sql_agent = sql_agent
        # Using the latest GPT-5 model
        self.model = "gpt-5-chat-latest"
        
    async def process(self, query: str, user_id: str, **kwargs) -> Dict[str, Any]:
        """
        Process financial modeling with GPT-5 doing all the work.
        Enhanced with CashFlow Brief support and dynamic locale awareness.
        """
        start_time = time.time()
        request_id = str(uuid.uuid4())[:8]
        scenario = kwargs.get('scenario', None)
        
        # Initialize observability context
        obs_ctx = ObservabilityContext('FinancialModelingAgent', request_id, scenario)
        
        try:
            logger.info(f"[{request_id}] Processing with GPT-5: {query[:100]}...")
            
            # Check if we have routing metadata for SQL brief
            routing_metadata = kwargs.get('routing_metadata', {})
            sources_used = routing_metadata.get('sources_used', [])
            
            # Log initial context (don't pass request_id, it's already in context)
            obs_ctx.log(logger, 'INFO',
                       sources_expected=sources_used,
                       notes="Starting financial modeling")
            
            # Determine data source strategy
            if 'sql_cashflow_brief' in sources_used and self.sql_agent:
                # Use SQL CashFlow Brief for quick retrieval
                logger.info(f"[{request_id}] Using SQL CashFlow Brief for data")
                brief = self.sql_agent.get_cashflow_brief(user_id, request_id=request_id, scenario=scenario)
                
                # Get minimal additional context from DB
                essential_data = await self._get_essential_context(user_id)
                
                # Combine brief with essential data
                full_data = self._format_brief_data(brief, essential_data)
            else:
                # Full database dump for comprehensive analysis
                logger.info(f"[{request_id}] Performing full database dump")
                full_data = await self._dump_all_user_data(user_id)
            
            # Get user locale for tax awareness (dynamic determination)
            user_locale = self._get_user_locale(user_id)
            
            # Ask GPT-5 to analyze and calculate everything
            result_data = await self._analyze_with_gpt5(query, full_data, user_locale)
            
            # Parse structured response from GPT-5
            response, provenance = self._parse_gpt5_response(result_data)
            
            # Add tax rate range assumption
            tax_range = user_locale.get('tax_rate_range', [0.20, 0.35])
            tax_assumption = f"effective_tax_rate_range_{tax_range[0]:.0%}-{tax_range[1]:.0%}"
            if tax_assumption not in str(provenance.get('assumptions', [])):
                provenance['assumptions'].append(tax_assumption)
            
            # Log provenance and completion
            obs_ctx.set_provenance(
                assumptions=provenance.get('assumptions', []),
                data_gaps=provenance.get('data_gaps', []),
                completeness_score=provenance.get('completeness_score', 0.8),
                verdict=provenance.get('verdict', 'PASS')
            )
            
            # Extract and log math checks if present in response
            math_checks = self._extract_math_checks(result_data)
            if math_checks:
                obs_ctx.set_math_checks(**math_checks)
            
            obs_ctx.log(logger, 'INFO',
                       locale_used=user_locale.get('locale_name'),
                       tax_rate=user_locale.get('tax_rate'),
                       notes="Modeling complete")
            
            execution_time = time.time() - start_time
            
            # Enhanced metadata with provenance
            metadata = {
                'request_id': request_id,
                'execution_time': execution_time,
                'model_used': self.model,
                'sources_used': sources_used,
                'locale': user_locale,
                'provenance': provenance
            }
            
            self._log_execution(
                {'query': query, 'user_id': user_id, 'model': self.model, 'locale': user_locale},
                {'success': True, 'response': response, 'execution_time': execution_time, 'provenance': provenance},
                execution_time,
                user_id
            )
            
            return {
                'success': True,
                'response': response,
                'metadata': metadata,
                'confidence': provenance.get('completeness_score', 0.8)
            }
            
        except Exception as e:
            logger.error(f"[{request_id}] GPT-5 processing error: {e}")
            return {
                'success': False,
                'error_message': str(e),
                'metadata': {'request_id': request_id}
            }
    
    async def _dump_all_user_data(self, user_id: str) -> str:
        """
        Dump complete user financial data for GPT-5 analysis.
        """
        conn = None
        try:
            conn = self.db_pool.getconn()
            cur = conn.cursor()
            
            data_sections = []
            data_sections.append(f"=== COMPLETE FINANCIAL DATA FOR USER {user_id} ===")
            data_sections.append(f"Current Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            data_sections.append("="*60)
            
            # All queries to dump complete financial picture
            queries = {
                'USER_PROFILE': f"""
                    SELECT * FROM users WHERE id = %s
                """,
                
                'ACCOUNTS': f"""
                    SELECT * FROM accounts WHERE user_id = %s ORDER BY balance DESC
                """,
                
                'BUDGETS': f"""
                    SELECT * FROM budgets WHERE user_id = %s ORDER BY amount DESC
                """,
                
                'BUDGET_DETAILS': f"""
                    SELECT b.name as budget_name, b.amount as budget_total, 
                           bc.category, bc.amount as category_amount
                    FROM budgets b
                    LEFT JOIN budget_categories bc ON b.id = bc.budget_id
                    WHERE b.user_id = %s
                    ORDER BY b.name, bc.category
                """,
                
                'FINANCIAL_GOALS': f"""
                    SELECT * FROM goals WHERE user_id = %s 
                    ORDER BY target_date, priority DESC
                """,
                
                'ASSETS': f"""
                    SELECT * FROM manual_assets WHERE user_id = %s 
                    ORDER BY value DESC
                """,
                
                'LIABILITIES': f"""
                    SELECT * FROM manual_liabilities WHERE user_id = %s 
                    ORDER BY balance DESC
                """,
                
                'RECURRING_INCOME': f"""
                    SELECT * FROM recurring_income WHERE user_id = %s 
                    ORDER BY gross_monthly DESC
                """,
                
                'INSURANCE_POLICIES': f"""
                    SELECT * FROM insurances WHERE user_id = %s
                """,
                
                'RECENT_TRANSACTIONS': f"""
                    SELECT date, merchant_name, category, amount, pending, account_id
                    FROM transactions 
                    WHERE user_id = %s 
                    ORDER BY date DESC 
                    LIMIT 50
                """,
                
                'MONTHLY_CASH_FLOW_12M': f"""
                    SELECT 
                        DATE_TRUNC('month', date) as month,
                        SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as income,
                        SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END) as expenses,
                        COUNT(*) as transaction_count
                    FROM transactions
                    WHERE user_id = %s 
                    AND date >= CURRENT_DATE - INTERVAL '12 months'
                    GROUP BY DATE_TRUNC('month', date)
                    ORDER BY month DESC
                """,
                
                'SPENDING_BY_CATEGORY_6M': f"""
                    SELECT 
                        category,
                        SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END) as total_spent,
                        COUNT(*) as transaction_count,
                        AVG(CASE WHEN amount < 0 THEN -amount ELSE NULL END) as avg_transaction
                    FROM transactions
                    WHERE user_id = %s 
                    AND date >= CURRENT_DATE - INTERVAL '6 months'
                    AND amount < 0
                    GROUP BY category
                    ORDER BY total_spent DESC
                """,
                
                'TRANSACTION_SUMMARY': f"""
                    SELECT 
                        COUNT(*) as total_transactions,
                        MIN(date) as earliest_date,
                        MAX(date) as latest_date,
                        SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as lifetime_income,
                        SUM(CASE WHEN amount < 0 THEN -amount ELSE 0 END) as lifetime_expenses,
                        AVG(CASE WHEN amount < 0 THEN -amount ELSE NULL END) as avg_expense,
                        AVG(CASE WHEN amount > 0 THEN amount ELSE NULL END) as avg_income
                    FROM transactions 
                    WHERE user_id = %s
                """
            }
            
            # Execute each query and format results
            for section_name, query in queries.items():
                try:
                    cur.execute(query, (user_id,))
                    rows = cur.fetchall()
                    
                    if cur.description:
                        columns = [desc[0] for desc in cur.description]
                        
                        data_sections.append(f"\n### {section_name.replace('_', ' ')}")
                        data_sections.append("-" * 40)
                        
                        if rows:
                            for row in rows:
                                row_dict = {}
                                for col, val in zip(columns, row):
                                    # Format values for readability
                                    if isinstance(val, Decimal):
                                        row_dict[col] = float(val)
                                    elif hasattr(val, 'isoformat'):
                                        row_dict[col] = val.isoformat()
                                    elif isinstance(val, uuid.UUID):
                                        row_dict[col] = str(val)
                                    else:
                                        row_dict[col] = val
                                
                                # Format as readable text
                                data_sections.append(json.dumps(row_dict, indent=2))
                        else:
                            data_sections.append("No data available")
                            
                except Exception as e:
                    logger.warning(f"Error fetching {section_name}: {e}")
                    data_sections.append(f"\n### {section_name}")
                    data_sections.append(f"Error loading data: {e}")
            
            return "\n".join(data_sections)
            
        except Exception as e:
            logger.error(f"Database dump error: {e}")
            return f"Error accessing database: {e}"
        finally:
            if conn:
                cur.close()
                self.db_pool.putconn(conn)
    
    def _get_user_locale(self, user_id: str) -> Dict[str, Any]:
        """
        Get user locale information from actual database tables.
        Returns location data for LLM to infer appropriate tax rates.
        """
        conn = None
        try:
            conn = self.db_pool.getconn()
            cur = conn.cursor()
            
            # Get location from user_identity table (which actually exists)
            cur.execute("""
                SELECT city, state, postal_code
                FROM user_identity 
                WHERE user_id = %s
            """, (user_id,))
            identity = cur.fetchone()
            
            # Get tax profile if it exists
            cur.execute("""
                SELECT filing_status, state, federal_rate, state_rate
                FROM tax_profile
                WHERE user_id = %s
            """, (user_id,))
            tax_profile = cur.fetchone()
            
            cur.close()
            
            locale_data = {}
            
            if identity:
                locale_data['city'] = identity[0] or None
                locale_data['state'] = identity[1] or None
                locale_data['postal_code'] = identity[2] or None
            
            if tax_profile:
                locale_data['filing_status'] = tax_profile[0]
                locale_data['tax_state'] = tax_profile[1]
                locale_data['federal_rate'] = float(tax_profile[2]) if tax_profile[2] else None
                locale_data['state_rate'] = float(tax_profile[3]) if tax_profile[3] else None
            
            # Let the LLM infer everything else from location/income
            locale_data['llm_should_infer'] = True
            locale_data['inference_note'] = 'Infer tax rates and property tax from location and income level'
            
            return locale_data
            
        except Exception as e:
            logger.warning(f"Could not load user locale for {user_id}: {e}")
            return {
                'llm_should_infer': True,
                'inference_note': 'No location data available - use context clues or ask user'
            }
        finally:
            if conn:
                self.db_pool.putconn(conn)
    
    async def _get_essential_context(self, user_id: str) -> Dict[str, Any]:
        """
        Get minimal essential context when using CashFlow Brief.
        """
        conn = None
        try:
            conn = self.db_pool.getconn()
            cur = conn.cursor()
            
            # Get key financial goals and assets
            cur.execute("""
                SELECT name, target_amount, current_amount, target_date, priority
                FROM goals 
                WHERE user_id = %s 
                ORDER BY priority DESC
                LIMIT 5
            """, (user_id,))
            goals = cur.fetchall()
            
            cur.execute("""
                SELECT name, value, asset_class as type
                FROM manual_assets
                WHERE user_id = %s
                ORDER BY value DESC
                LIMIT 5
            """, (user_id,))
            assets = cur.fetchall()
            
            return {
                'goals': [dict(zip(['name', 'target_amount', 'current_amount', 'target_date', 'priority'], g)) for g in goals],
                'assets': [dict(zip(['name', 'value', 'type'], a)) for a in assets]
            }
        except Exception as e:
            logger.error(f"Error getting essential context: {e}")
            return {'goals': [], 'assets': []}
        finally:
            if conn:
                cur.close()
                self.db_pool.putconn(conn)
    
    def _format_brief_data(self, brief: Dict[str, Any], essential_data: Dict[str, Any]) -> str:
        """
        Format CashFlow Brief and essential data for GPT-5.
        """
        sections = []
        sections.append("=== CASHFLOW BRIEF (OPTIMIZED DATA) ===")
        sections.append(f"Current Date: {datetime.now().strftime('%Y-%m-%d')}")
        sections.append("")
        
        # Core financial metrics from brief
        sections.append("### LIQUID ASSETS")
        sections.append(f"Cash & Depository: ${brief.get('cash_depository', 0):,.2f}")
        sections.append(f"Taxable Investments: ${brief.get('taxable_investments', 0):,.2f}")
        sections.append(f"Retirement (401k/IRA): ${brief.get('retirement_balances', 0):,.2f}")
        sections.append("")
        
        sections.append("### LIABILITIES")
        sections.append(f"Credit Card Debt: ${brief.get('cc_total_balance', 0):,.2f} ({brief.get('cc_num_cards', 0)} cards)")
        sections.append(f"Installment Loans: ${brief.get('installment_balance', 0):,.2f} @ {brief.get('installment_avg_apr', 0):.1f}% APR")
        sections.append("")
        
        sections.append("### CASH FLOW")
        sections.append(f"Essential Expenses (6mo avg): ${brief.get('essentials_avg_6m', 0):,.2f}/month")
        sections.append(f"Time Window: {brief.get('time_window', 'last_6_months')}")
        sections.append("")
        
        # Add notes if present
        if brief.get('notes'):
            sections.append("### NOTES")
            for note in brief['notes']:
                sections.append(f"- {note}")
            sections.append("")
        
        # Add essential context
        if essential_data.get('goals'):
            sections.append("### FINANCIAL GOALS")
            for goal in essential_data['goals']:
                progress = (goal['current_amount'] / goal['target_amount'] * 100) if goal['target_amount'] else 0
                sections.append(f"- {goal['name']}: ${goal['current_amount']:,.0f} / ${goal['target_amount']:,.0f} ({progress:.0f}%)")
            sections.append("")
        
        if essential_data.get('assets'):
            sections.append("### MAJOR ASSETS")
            for asset in essential_data['assets']:
                sections.append(f"- {asset['name']}: ${asset['value']:,.0f}")
            sections.append("")
        
        return "\n".join(sections)
    
    def _parse_gpt5_response(self, response: str) -> tuple[str, Dict[str, Any]]:
        """
        Parse GPT-5 response to extract main content and provenance metadata.
        """
        # Look for structured sections in the response
        import re
        
        # Default provenance
        provenance = {
            'assumptions': [],
            'data_gaps': [],
            'sources_used': ['user_financial_data'],
            'completeness_score': 0.8,
            'verdict': 'OK'
        }
        
        # Check for new PROVENANCE_FOOTER_V2 format first
        if "PROVENANCE_FOOTER_V2" in response:
            # Extract the footer section
            footer_match = re.search(r"PROVENANCE_FOOTER_V2(.*?)$", response, re.DOTALL)
            if footer_match:
                footer_text = footer_match.group(1)
                
                # Parse V2 format with enhanced fields
                assumptions_match = re.search(r"\*\*assumptions\*\*:\[(.*?)\]", footer_text)
                if assumptions_match:
                    assumptions = assumptions_match.group(1).strip()
                    provenance['assumptions'] = [a.strip() for a in assumptions.split(',') if a.strip()]
                
                gaps_match = re.search(r"\*\*data_gaps\*\*:\[(.*?)\]", footer_text)
                if gaps_match:
                    gaps = gaps_match.group(1).strip()
                    provenance['data_gaps'] = [g.strip() for g in gaps.split(',') if g.strip()]
                
                sources_match = re.search(r"\*\*sources_used\*\*:\[(.*?)\]", footer_text)
                if sources_match:
                    sources = sources_match.group(1).strip()
                    provenance['sources_used'] = [s.strip() for s in sources.split(',') if s.strip()]
                
                score_match = re.search(r"\*\*completeness_score\*\*:(\d+\.?\d*)", footer_text)
                if score_match:
                    provenance['completeness_score'] = float(score_match.group(1))
                
                verdict_match = re.search(r"\*\*verdict\*\*:\[(.*?)\]", footer_text)
                if verdict_match:
                    provenance['verdict'] = verdict_match.group(1).strip()
                
                # Extract enhanced DTI analysis
                dti_match = re.search(r"\*\*dti_analysis\*\*:\[(.*?)\]", footer_text)
                if dti_match:
                    dti_data = dti_match.group(1).strip()
                    provenance['dti_analysis'] = [d.strip() for d in dti_data.split(',') if d.strip()]
                
                # Extract cash analysis
                cash_match = re.search(r"\*\*cash_analysis\*\*:\[(.*?)\]", footer_text)
                if cash_match:
                    cash_data = cash_match.group(1).strip()
                    provenance['cash_analysis'] = [c.strip() for c in cash_data.split(',') if c.strip()]
            
            # Clean response of footer
            clean_response = response.split("PROVENANCE_FOOTER_V2")[0].strip()
            clean_response = clean_response.rstrip('-').strip()
        
        # Fallback to V1 PROVENANCE FOOTER format
        elif "PROVENANCE FOOTER" in response:
            # Extract the footer section
            footer_match = re.search(r"PROVENANCE FOOTER(.*?)$", response, re.DOTALL)
            if footer_match:
                footer_text = footer_match.group(1)
                
                # Extract assumptions
                assumptions_match = re.search(r"\*\*assumptions\*\*:\s*\[(.*?)\]", footer_text, re.DOTALL)
                if assumptions_match:
                    assumptions = assumptions_match.group(1).strip()
                    provenance['assumptions'] = [a.strip() for a in assumptions.split(',') if a.strip()]
                
                # Extract data gaps
                gaps_match = re.search(r"\*\*data_gaps\*\*:\s*\[(.*?)\]", footer_text, re.DOTALL)
                if gaps_match:
                    gaps = gaps_match.group(1).strip()
                    provenance['data_gaps'] = [g.strip() for g in gaps.split(',') if g.strip()]
                
                # Extract sources used
                sources_match = re.search(r"\*\*sources_used\*\*:\s*\[(.*?)\]", footer_text, re.DOTALL)
                if sources_match:
                    sources = sources_match.group(1).strip()
                    provenance['sources_used'] = [s.strip() for s in sources.split(',') if s.strip()]
                
                # Extract completeness score
                score_match = re.search(r"\*\*completeness_score\*\*:\s*(\d+\.?\d*)", footer_text)
                if score_match:
                    provenance['completeness_score'] = float(score_match.group(1))
                
                # Extract verdict
                verdict_match = re.search(r"\*\*verdict\*\*:\s*\[(.*?)\]", footer_text)
                if verdict_match:
                    provenance['verdict'] = verdict_match.group(1).strip()
            
            # Clean response of footer
            clean_response = response.split("PROVENANCE FOOTER")[0].strip()
            clean_response = clean_response.rstrip('-').strip()
        
        # Fallback to old format if new format not found
        elif "ASSUMPTIONS:" in response:
            assumptions_match = re.search(r"ASSUMPTIONS:(.*?)(?=\n\n|DATA GAPS:|VERDICT:|$)", response, re.DOTALL)
            if assumptions_match:
                assumptions = assumptions_match.group(1).strip().split('\n')
                provenance['assumptions'] = [a.strip('- ').strip() for a in assumptions if a.strip()]
            
            if "DATA GAPS:" in response:
                gaps_match = re.search(r"DATA GAPS:(.*?)(?=\n\n|VERDICT:|$)", response, re.DOTALL)
                if gaps_match:
                    gaps = gaps_match.group(1).strip().split('\n')
                    provenance['data_gaps'] = [g.strip('- ').strip() for g in gaps if g.strip()]
            
            if "VERDICT:" in response:
                verdict_match = re.search(r"VERDICT:\s*(PASS|NEEDS_DATA|PARTIAL|OK|ADVICE_PROVIDED)", response)
                if verdict_match:
                    provenance['verdict'] = verdict_match.group(1)
            
            # Clean response of metadata sections if present
            clean_response = response
            for marker in ["ASSUMPTIONS:", "DATA GAPS:", "VERDICT:"]:
                if marker in clean_response:
                    clean_response = clean_response.split(marker)[0]
        else:
            clean_response = response
        
        # Calculate completeness score based on data gaps if not already set
        if provenance['data_gaps'] and provenance['completeness_score'] == 0.8:
            provenance['completeness_score'] = max(0.5, 1.0 - len(provenance['data_gaps']) * 0.1)
        
        return clean_response.strip(), provenance
    
    def _load_policy(self, filename: str) -> str:
        """Load policy file content."""
        import os
        policy_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)), 
            'prompts', 
            filename
        )
        try:
            with open(policy_path, 'r') as f:
                return f.read()
        except FileNotFoundError:
            logger.warning(f"Policy file {filename} not found")
            return ""
    
    def _extract_math_checks(self, response: str) -> Dict[str, Any]:
        """
        Extract mathematical validation data from response.
        """
        import re
        
        math_data = {}
        
        # Try to extract DTI calculations
        dti_match = re.search(r'DTI.*?(\d+\.?\d*)%', response, re.IGNORECASE)
        if dti_match:
            math_data['dti_found'] = float(dti_match.group(1)) / 100
        
        # Try to extract PMI mentions
        if re.search(r'\bPMI\b|private mortgage insurance', response, re.IGNORECASE):
            math_data['pmi_mentioned'] = True
            pmi_amount = re.search(r'PMI.*?\$(\d+)', response, re.IGNORECASE)
            if pmi_amount:
                math_data['pmi_amount'] = float(pmi_amount.group(1))
        
        # Extract housing payment components if mentioned
        pi_match = re.search(r'principal.*?interest.*?\$(\d+)', response, re.IGNORECASE)
        if pi_match:
            math_data['pi'] = float(pi_match.group(1))
        
        # Property tax
        ptax_match = re.search(r'property tax.*?\$(\d+)', response, re.IGNORECASE)
        if ptax_match:
            math_data['p_tax'] = float(ptax_match.group(1))
        
        # Insurance
        ins_match = re.search(r'insurance.*?\$(\d+)', response, re.IGNORECASE)
        if ins_match:
            math_data['insurance'] = float(ins_match.group(1))
        
        return math_data
    
    async def _analyze_with_gpt5(self, query: str, financial_data: str, locale: Dict[str, Any]) -> str:
        """
        Let GPT-5 analyze everything and provide comprehensive financial modeling.
        Enhanced with locale awareness and structured output.
        """
        from datetime import datetime
        current_date = datetime.now().strftime('%Y-%m-%d')
        
        # Load policy files
        tax_policy = self._load_policy('policy_tax.md')
        affordability_policy = self._load_policy('policy_affordability.md')
        cashflow_policy = self._load_policy('policy_cashflow.md')
        
        # Build dynamic locale guidance based on actual data
        locale_guidance = f"""
TAX AND LOCATION GUIDANCE:
- User Location: {locale.get('city', 'Unknown')}, {locale.get('state', 'Unknown')} {locale.get('postal_code', '')}
- Determine appropriate tax rates based on:
  * Actual location: {locale.get('state', 'not specified')}
  * Income level from financial data
  * If location is New York: Use NYC tax rates (federal + state + city)
  * If location unknown: Use conservative US averages (22-32% effective)
- Property tax rates:
  * If NYC/NY: Use 1.925% (NYC average)
  * If other location: Research typical rates for that area
  * If unknown: Use 1.1% (US median)
- Always explain your tax assumptions in the response

POLICIES TO FOLLOW:
{tax_policy}

{affordability_policy}

{cashflow_policy}
"""
        
        prompt = f"""You are an expert financial advisor using GPT-5's advanced reasoning capabilities.

CURRENT DATE: {current_date}

{locale_guidance}

Analyze the complete financial data provided and answer the user's question with precision.
Perform ALL calculations yourself - show your step-by-step reasoning and math.
Consider all relevant financial factors and real-world considerations.

## ENHANCED DTI AND SAVINGS GUIDELINES

### Debt-to-Income (DTI) Bounds - STRICT ENFORCEMENT
**Housing DTI Limits:**
- Conservative/Safe: ≤ 25% of gross monthly income  
- Standard/Acceptable: ≤ 28% of gross monthly income
- Aggressive/Maximum: ≤ 31% of gross monthly income (only with strong reserves)

**Total DTI Limits:**
- Conservative/Safe: ≤ 36% of gross monthly income
- Standard/Acceptable: ≤ 43% of gross monthly income  
- Aggressive/Maximum: ≤ 50% of gross monthly income (only for high earners with stable income)

**Always specify which DTI standard you're applying and why.**

### Emergency Fund and Savings Requirements
**Emergency Fund Minimums:**
- Stable W-2 income: 3-6 months essential expenses
- Variable/gig income: 6-12 months essential expenses  
- Self-employed: 9-12 months essential expenses

**Post-Purchase Cash Requirements:**
- Always maintain emergency fund AFTER major purchases
- Additional 2-3 months expenses for home purchase (maintenance buffer)
- Never count retirement funds as liquid reserves

**Savings Rate Targets:**
- Minimum sustainable: 10% of gross income
- Recommended: 15-20% of gross income
- High-growth phase: 25%+ of gross income

For any financial question:
- Identify relevant data points from the provided information
- Perform necessary calculations (compound interest, loan payments, DTI ratios, etc.)
- Consider tax implications using the locale-specific rates above
- Provide specific, actionable recommendations with DTI analysis
- Identify potential risks and alternative scenarios
- ALWAYS apply appropriate DTI bounds based on user's risk profile

For house affordability specifically:
- Calculate true monthly income (watch for duplicates)
- Determine and document the effective tax rate range based on income and location
- Determine actual monthly expenses from transaction data
- Calculate debt-to-income ratios using ENHANCED DTI BOUNDS above
- Consider down payment sources and liquid assets
- Include ALL housing costs with location-appropriate rates:
  * Mortgage principal and interest
  * Property taxes (use location-specific if known, else US median)
  * Homeowners insurance (adjust for high-cost areas if applicable)
  * HOA fees if applicable
  * Maintenance budget (1-2% of home value annually)
- Assess impact on emergency fund and financial goals
- Apply post-purchase cash requirements

IMPORTANT: The data may contain duplicates or anomalies. Use your judgment to identify and handle these appropriately.

USER QUESTION: {query}

COMPLETE FINANCIAL DATA:
{financial_data}

Structure your response with:
1. Main analysis and calculations with step-by-step reasoning
2. Clear numeric final answer or range (not just formulas)
3. Summary section with actionable recommendations
4. DTI analysis with specific bounds applied

REQUIRED: End your response with this MACHINE-PARSABLE PROVENANCE FOOTER:

---
**PROVENANCE_FOOTER_V2**
**assumptions**:[tax_rate_range_used,dti_bounds_applied,emergency_fund_standard_used,essential_expenses_calculation_method]
**data_gaps**:[missing_income_sources,missing_expense_categories,missing_asset_details,missing_location_data]
**sources_used**:[recurring_income,manual_liabilities,cashflow_brief,transaction_history,manual_assets,goals]
**completeness_score**:0.85
**verdict**:[COMPREHENSIVE|ADVICE_PROVIDED|NEEDS_DATA|INSUFFICIENT_DATA]
**dti_analysis**:[housing_dti_pct,total_dti_pct,dti_safety_level,bounds_applied]
**cash_analysis**:[emergency_fund_months,post_purchase_liquidity,savings_rate_pct]

Provide a thorough analysis with specific numeric results, not just formulas."""

        messages = [
            {"role": "user", "content": prompt}
        ]
        
        logger.info(f"Calling GPT-5 model: {self.model} with {locale['locale_name']} locale")
        
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.2  # Low temperature for consistent calculations
            # No max_tokens - let GPT-5 use whatever it needs
            # No response_format - let GPT-5 structure naturally
        )
        
        return response.choices[0].message.content