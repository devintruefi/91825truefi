# TRUEFIBACKEND/validation/schemas.py
# JSON schemas for agent I/O validation

from pydantic import BaseModel, Field, validator
from typing import Dict, List, Optional, Any, Literal
from datetime import datetime

# SQL Agent Schemas
class SQLRequestSchema(BaseModel):
    """Schema for SQL Agent request"""
    kind: Literal["sql_request"] = "sql_request"
    question: str = Field(..., min_length=1, max_length=1000)
    schema_card: Dict[str, Any] = Field(..., description="Transactions schema card")
    context: Dict[str, str] = Field(..., description="Must contain user_id")
    constraints: Dict[str, Any] = Field(default_factory=lambda: {
        "max_rows": 1000,
        "exclude_pending": True,
        "prefer_monthly_bins": True
    })

    @validator('context')
    def validate_context(cls, v):
        if 'user_id' not in v:
            raise ValueError('context must contain user_id')
        return v

class SQLResponseSchema(BaseModel):
    """Schema for SQL Agent response"""
    sql: str = Field(..., min_length=1, max_length=10000)
    params: Dict[str, Any] = Field(..., description="Query parameters")
    justification: str = Field(..., min_length=1, max_length=500)

    @validator('params')
    def validate_params(cls, v):
        if 'user_id' not in v:
            raise ValueError('params must contain user_id')
        return v

# Modeling Agent Schemas
class ComputationSchema(BaseModel):
    """Schema for computation details"""
    name: str
    formula: str
    inputs: Dict[str, Any]
    result: Any

class UIBlockSchema(BaseModel):
    """Schema for UI blocks with rich formatting support"""
    type: Literal["table", "text", "chart", "kpi_card", "equation", "pie_chart", "bar_chart", "line_chart", "timeline", "alert"]
    title: str
    data: Any
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

class DataRequestSchema(BaseModel):
    """Schema for next data requests"""
    reason: str
    desired_slice: Dict[str, Any]

class ModelRequestSchema(BaseModel):
    """Schema for Modeling Agent request"""
    kind: Literal["model_request"] = "model_request"
    question: str
    profile_pack: Dict[str, Any]
    sql_plan: Dict[str, Any]
    sql_result: Dict[str, Any]

class ModelResponseSchema(BaseModel):
    """Schema for Modeling Agent response"""
    answer_markdown: str = Field(..., min_length=1)
    assumptions: List[str] = Field(default_factory=list)
    computations: List[ComputationSchema] = Field(default_factory=list)
    ui_blocks: List[UIBlockSchema] = Field(default_factory=list)
    next_data_requests: List[DataRequestSchema] = Field(default_factory=list)

# Critique Agent Schemas
class CritiqueRequestSchema(BaseModel):
    """Schema for Critique Agent request"""
    stage: Literal["pre_sql", "post_sql", "post_model"]
    question: str
    schema_card: Dict[str, Any]
    payload: Dict[str, Any]

class CritiqueResponseSchema(BaseModel):
    """Schema for Critique Agent response"""
    status: Literal["approve", "revise_sql", "revise_model"]
    edits: Dict[str, Any] = Field(default_factory=dict)
    issues: List[str] = Field(default_factory=list)
    invariants_check: Dict[str, Any] = Field(default_factory=lambda: {"passed": True, "notes": []})

# Profile Pack Schemas
class UserCoreSchema(BaseModel):
    """User core information"""
    user_id: str
    first_name: Optional[str]
    last_name: Optional[str]
    email: Optional[str]
    currency: str = "USD"
    timezone: str = "UTC"
    created_at: Optional[datetime]

class AccountSchema(BaseModel):
    """Account information"""
    id: str
    name: str
    type: str
    balance: float
    currency: str = "USD"
    institution_name: Optional[str]
    is_active: bool = True

class DerivedMetricsSchema(BaseModel):
    """Derived financial metrics"""
    net_worth: float
    liquid_reserves_months: float
    savings_rate_3m: Optional[float]
    savings_rate_6m: Optional[float]
    savings_rate_12m: Optional[float]
    total_assets: float
    total_liabilities: float
    debt_to_income: Optional[float]

class ProfilePackSchema(BaseModel):
    """Complete Profile Pack schema"""
    user_core: UserCoreSchema
    accounts: List[AccountSchema]
    derived_metrics: DerivedMetricsSchema
    transactions_sample: List[Dict[str, Any]]
    schema_excerpt: Dict[str, List[str]]
    generated_at: datetime
    cache_expires_at: datetime

# Transaction Schema Card
class TransactionSchemaCard(BaseModel):
    """Transaction table schema information"""
    table: str = "public.transactions"
    columns: Dict[str, str]
    notes: Dict[str, str]
    safe_filters: List[str]
    examples: List[Dict[str, str]]