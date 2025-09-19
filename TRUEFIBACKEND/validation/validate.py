# TRUEFIBACKEND/validation/validate.py
# JSON validation utilities

from typing import Any, Dict, Tuple, Optional
from pydantic import ValidationError
import json
import logging

logger = logging.getLogger(__name__)

def validate_json(data: Any, schema_class: Any) -> Tuple[bool, Optional[Any], Optional[str]]:
    """
    Validate JSON data against a Pydantic schema
    Returns (is_valid, validated_data, error_message)
    """
    try:
        # If data is string, parse it first
        if isinstance(data, str):
            data = json.loads(data)

        # Validate against schema
        validated = schema_class(**data)
        return True, validated, None

    except json.JSONDecodeError as e:
        error_msg = f"Invalid JSON: {str(e)}"
        logger.error(error_msg)
        return False, None, error_msg

    except ValidationError as e:
        error_msg = f"Validation error: {e.json()}"
        logger.error(error_msg)
        return False, None, error_msg

    except Exception as e:
        error_msg = f"Unexpected error: {str(e)}"
        logger.error(error_msg)
        return False, None, error_msg