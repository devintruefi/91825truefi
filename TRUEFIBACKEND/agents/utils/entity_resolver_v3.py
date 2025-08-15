"""
Entity Resolver v3 - Hardened with comprehensive security and validation
Secure entity resolution with fuzzy matching, input validation, and monitoring
"""
import logging
import json
import time
import hashlib
from typing import Dict, Set, Optional, List, Any, Union, Tuple
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime, timezone
import re
import uuid

# Try to import rapidfuzz for better performance, fallback to difflib
try:
    from rapidfuzz import process, fuzz
    RAPIDFUZZ_AVAILABLE = True
except ImportError:
    from difflib import get_close_matches
    RAPIDFUZZ_AVAILABLE = False

logger = logging.getLogger(__name__)

class EntityType(Enum):
    """Supported entity types."""
    MERCHANT = "merchant"
    CATEGORY = "category" 
    ACCOUNT = "account"
    BUDGET = "budget"
    GOAL = "goal"
    ASSET = "asset"
    LIABILITY = "liability"

class MatchQuality(Enum):
    """Match quality levels."""
    EXACT = "exact"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    NO_MATCH = "no_match"

@dataclass
class EntityMatch:
    """Structured entity match result."""
    entity_type: EntityType
    original_text: str
    matched_value: Optional[str]
    confidence_score: float
    match_quality: MatchQuality
    fuzzy_matches: List[Tuple[str, float]] = field(default_factory=list)
    validation_errors: List[str] = field(default_factory=list)

@dataclass
class ResolutionContext:
    """Context for entity resolution."""
    user_id: str
    query_text: str
    timestamp: datetime
    available_entities: Dict[EntityType, Set[str]]
    resolution_settings: Dict[str, Any]

class EntityResolverV3:
    """
    Hardened entity resolver with comprehensive security and validation.
    Provides secure fuzzy matching with input validation and monitoring.
    """
    
    # Entity type mappings with validation patterns
    ENTITY_MAPPINGS = {
        EntityType.MERCHANT: {
            'cache_keys': ['user_merchants'],
            'patterns': [r'\\b(?:at|from|with)\\s+([A-Za-z0-9\\s&\\-\']{2,50})\\b'],
            'max_length': 200,
            'min_confidence': 0.6
        },
        EntityType.CATEGORY: {
            'cache_keys': ['user_categories', 'all_transaction_categories'],
            'patterns': [r'\\b(?:category|spent on|for)\\s+([A-Za-z0-9\\s&\\-\']{2,50})\\b'],
            'max_length': 100,
            'min_confidence': 0.7
        },
        EntityType.ACCOUNT: {
            'cache_keys': ['user_account_names'],
            'patterns': [r'\\b(?:account|from|in)\\s+([A-Za-z0-9\\s&\\-\']{2,50})\\b'],
            'max_length': 200,
            'min_confidence': 0.8
        },
        EntityType.BUDGET: {
            'cache_keys': ['user_budget_names'],
            'patterns': [r'\\b(?:budget|budgeted)\\s+([A-Za-z0-9\\s&\\-\']{2,50})\\b'],
            'max_length': 200,
            'min_confidence': 0.8
        },
        EntityType.GOAL: {
            'cache_keys': ['user_goal_names'], 
            'patterns': [r'\\b(?:goal|saving for)\\s+([A-Za-z0-9\\s&\\-\']{2,50})\\b'],
            'max_length': 200,
            'min_confidence': 0.8
        }
    }
    
    # Suspicious pattern detection
    SUSPICIOUS_PATTERNS = [
        r'<[^>]+>',        # HTML tags
        r'javascript:',    # JavaScript URLs
        r'SELECT.*FROM',   # SQL injection
        r'UNION.*SELECT',  # SQL injection
        r'DROP\s+TABLE',   # SQL injection - DROP TABLE
        r'INSERT\s+INTO',  # SQL injection - INSERT
        r'DELETE\s+FROM',  # SQL injection - DELETE
        r';.*--',          # SQL injection - comment patterns
        r'[\x00-\x08\x0B\x0C\x0E-\x1F]|\\x[0-9a-fA-F]',  # Control characters or escape sequences
        r'\\{3,}',         # Excessive backslashes
        r'[{}[\]]{3,}',    # Excessive brackets
    ]
    
    def __init__(self, db_pool, fuzzy_threshold: float = 0.7):
        self.db_pool = db_pool
        self.fuzzy_threshold = max(0.1, min(1.0, fuzzy_threshold))  # Clamp between 0.1-1.0
        self._cache_store = {}
        self._resolution_stats = {
            'total_resolutions': 0,
            'successful_matches': 0,
            'fuzzy_matches': 0,
            'validation_failures': 0,
            'cache_hits': 0,
            'suspicious_input_blocked': 0
        }
        
    async def resolve_entities_secure(self, 
                                    query: str, 
                                    user_id: str,
                                    available_entities: Optional[Dict[str, Set[str]]] = None,
                                    entity_types: Optional[List[EntityType]] = None) -> Dict[str, Any]:
        """
        Securely resolve entities from query text with comprehensive validation.
        
        Args:
            query: Input query text
            user_id: User identifier (must be valid UUID)
            available_entities: Pre-fetched entity data (optional)
            entity_types: Specific entity types to resolve (optional)
            
        Returns:
            Resolution results with matches and metadata
        """
        start_time = time.time()
        
        # Input validation
        validation_result = self._validate_inputs(query, user_id)
        if not validation_result['valid']:
            self._resolution_stats['validation_failures'] += 1
            return {
                'success': False,
                'error': 'Input validation failed',
                'validation_errors': validation_result['errors'],
                'matches': {}
            }
        
        # Check for suspicious patterns
        if self._has_suspicious_patterns(query):
            self._resolution_stats['suspicious_input_blocked'] += 1
            logger.warning(f"Suspicious pattern detected in query for user {user_id[:8]}...")
            return {
                'success': False,
                'error': 'Suspicious input detected',
                'matches': {}
            }
        
        self._resolution_stats['total_resolutions'] += 1
        
        # Get or fetch entity cache
        if available_entities is None:
            available_entities = await self._get_user_entities_secure(user_id)
        
        # Determine entity types to process
        types_to_process = entity_types or list(EntityType)
        
        # Create resolution context
        context = ResolutionContext(
            user_id=user_id,
            query_text=query,
            timestamp=datetime.now(timezone.utc),
            available_entities=self._convert_entity_cache(available_entities),
            resolution_settings={
                'fuzzy_threshold': self.fuzzy_threshold,
                'max_matches_per_type': 10,
                'use_rapidfuzz': RAPIDFUZZ_AVAILABLE
            }
        )
        
        # Resolve entities by type
        resolution_results = {}
        total_matches = 0
        
        for entity_type in types_to_process:
            if entity_type in self.ENTITY_MAPPINGS:
                matches = await self._resolve_entity_type(context, entity_type)
                resolution_results[entity_type.value] = matches
                total_matches += len([m for m in matches if m.matched_value])
        
        # Update statistics
        if total_matches > 0:
            self._resolution_stats['successful_matches'] += 1
            fuzzy_matches = sum(1 for matches in resolution_results.values() 
                              for m in matches if m.match_quality in [MatchQuality.HIGH, MatchQuality.MEDIUM])
            self._resolution_stats['fuzzy_matches'] += fuzzy_matches
        
        processing_time = (time.time() - start_time) * 1000
        
        # Build response
        return {
            'success': True,
            'matches': {
                entity_type: [self._match_to_dict(match) for match in matches]
                for entity_type, matches in resolution_results.items()
            },
            'metadata': {
                'user_id': user_id,
                'processing_time_ms': processing_time,
                'total_matches': total_matches,
                'entity_types_processed': [t.value for t in types_to_process],
                'fuzzy_threshold': self.fuzzy_threshold,
                'resolution_context': {
                    'query_length': len(query),
                    'available_entity_counts': {
                        et.value: len(context.available_entities.get(et, set()))
                        for et in EntityType
                    }
                }
            }
        }
    
    async def _resolve_entity_type(self, context: ResolutionContext, entity_type: EntityType) -> List[EntityMatch]:
        """Resolve entities for a specific type."""
        mapping = self.ENTITY_MAPPINGS[entity_type]
        available_entities = context.available_entities.get(entity_type, set())
        
        if not available_entities:
            return []
        
        matches = []
        
        # Extract potential entities using patterns
        candidates = self._extract_candidates_by_pattern(context.query_text, mapping['patterns'])
        
        # Also try word-based extraction for broader matching
        word_candidates = self._extract_word_candidates(context.query_text, available_entities)
        candidates.extend(word_candidates)
        
        # Remove duplicates while preserving order
        seen = set()
        unique_candidates = []
        for candidate in candidates:
            if candidate.lower() not in seen:
                seen.add(candidate.lower())
                unique_candidates.append(candidate)
        
        # Resolve each candidate
        for candidate in unique_candidates[:10]:  # Limit to prevent DoS
            match = self._find_best_match(
                candidate, 
                available_entities, 
                entity_type,
                mapping['min_confidence']
            )
            if match:
                matches.append(match)
        
        return matches
    
    def _extract_candidates_by_pattern(self, query: str, patterns: List[str]) -> List[str]:
        """Extract entity candidates using regex patterns."""
        candidates = []
        
        for pattern in patterns:
            try:
                matches = re.finditer(pattern, query, re.IGNORECASE)
                for match in matches:
                    candidate = match.group(1).strip()
                    if len(candidate) >= 2:  # Minimum length
                        candidates.append(candidate)
            except re.error as e:
                logger.warning(f"Regex pattern error: {pattern}, {e}")
        
        return candidates
    
    def _extract_word_candidates(self, query: str, available_entities: Set[str]) -> List[str]:
        """Extract candidates by checking words against available entities."""
        candidates = []
        query_lower = query.lower()
        
        # Check for direct mentions of entities
        for entity in available_entities:
            if len(entity) >= 3 and entity.lower() in query_lower:
                candidates.append(entity)
        
        # Check for partial matches with common words
        query_words = re.findall(r'\\b[a-zA-Z]{3,}\\b', query)
        for word in query_words:
            if len(word) >= 3:
                # Find entities that start with this word
                matching_entities = [e for e in available_entities 
                                   if e.lower().startswith(word.lower())]
                candidates.extend(matching_entities[:3])  # Limit matches per word
        
        return candidates
    
    def _find_best_match(self, candidate: str, available_entities: Set[str], 
                        entity_type: EntityType, min_confidence: float) -> Optional[EntityMatch]:
        """Find the best match for a candidate using fuzzy matching."""
        if not candidate.strip() or len(candidate) > 200:
            return None
        
        # Validate candidate
        if self._has_suspicious_patterns(candidate):
            return EntityMatch(
                entity_type=entity_type,
                original_text=candidate,
                matched_value=None,
                confidence_score=0.0,
                match_quality=MatchQuality.NO_MATCH,
                validation_errors=['Suspicious pattern detected']
            )
        
        # Exact match check first
        candidate_lower = candidate.lower().strip()
        exact_matches = [e for e in available_entities if e.lower() == candidate_lower]
        if exact_matches:
            return EntityMatch(
                entity_type=entity_type,
                original_text=candidate,
                matched_value=exact_matches[0],
                confidence_score=1.0,
                match_quality=MatchQuality.EXACT
            )
        
        # Fuzzy matching
        if RAPIDFUZZ_AVAILABLE:
            matches = process.extract(
                candidate, 
                list(available_entities), 
                scorer=fuzz.WRatio,
                limit=5
            )
            fuzzy_matches = [(match, score/100.0) for match, score, _ in matches]
        else:
            # Fallback to difflib
            close_matches = get_close_matches(
                candidate, 
                list(available_entities), 
                n=5, 
                cutoff=min_confidence
            )
            fuzzy_matches = [(match, 0.8) for match in close_matches]  # Approximation
        
        if not fuzzy_matches:
            return EntityMatch(
                entity_type=entity_type,
                original_text=candidate,
                matched_value=None,
                confidence_score=0.0,
                match_quality=MatchQuality.NO_MATCH
            )
        
        # Get best match
        best_match, best_score = fuzzy_matches[0]
        
        # Determine match quality
        if best_score >= 0.9:
            quality = MatchQuality.HIGH
        elif best_score >= 0.7:
            quality = MatchQuality.MEDIUM
        elif best_score >= min_confidence:
            quality = MatchQuality.LOW
        else:
            quality = MatchQuality.NO_MATCH
        
        return EntityMatch(
            entity_type=entity_type,
            original_text=candidate,
            matched_value=best_match if quality != MatchQuality.NO_MATCH else None,
            confidence_score=best_score,
            match_quality=quality,
            fuzzy_matches=fuzzy_matches[:3]  # Keep top 3 alternatives
        )
    
    def _validate_inputs(self, query: str, user_id: str) -> Dict[str, Any]:
        """Validate input parameters."""
        errors = []
        
        # Query validation
        if not isinstance(query, str):
            errors.append("Query must be a string")
        elif len(query) == 0:
            errors.append("Query cannot be empty")
        elif len(query) > 5000:
            errors.append("Query too long (>5000 characters)")
        
        # User ID validation
        if not isinstance(user_id, str):
            errors.append("User ID must be a string")
        else:
            try:
                uuid.UUID(user_id)
            except ValueError:
                errors.append("User ID must be a valid UUID")
        
        return {
            'valid': len(errors) == 0,
            'errors': errors
        }
    
    def _has_suspicious_patterns(self, text: str) -> bool:
        """Check for suspicious patterns in input text."""
        for pattern in self.SUSPICIOUS_PATTERNS:
            if re.search(pattern, text, re.IGNORECASE):
                return True
        return False
    
    def _convert_entity_cache(self, cache: Dict[str, Any]) -> Dict[EntityType, Set[str]]:
        """Convert entity cache format to typed structure."""
        converted = {}
        
        for entity_type in EntityType:
            entity_set = set()
            mapping = self.ENTITY_MAPPINGS.get(entity_type, {})
            
            for cache_key in mapping.get('cache_keys', []):
                values = cache.get(cache_key, [])
                if isinstance(values, list):
                    # Validate and filter values
                    for value in values:
                        if (isinstance(value, str) and 
                            2 <= len(value) <= mapping.get('max_length', 200) and
                            not self._has_suspicious_patterns(value)):
                            entity_set.add(value.strip())
            
            converted[entity_type] = entity_set
        
        return converted
    
    def _match_to_dict(self, match: EntityMatch) -> Dict[str, Any]:
        """Convert EntityMatch to dictionary for JSON serialization."""
        return {
            'entity_type': match.entity_type.value,
            'original_text': match.original_text,
            'matched_value': match.matched_value,
            'confidence_score': round(match.confidence_score, 3),
            'match_quality': match.match_quality.value,
            'fuzzy_alternatives': [
                {'value': alt[0], 'score': round(alt[1], 3)} 
                for alt in match.fuzzy_matches[:3]
            ],
            'validation_errors': match.validation_errors
        }
    
    async def _get_user_entities_secure(self, user_id: str) -> Dict[str, Set[str]]:
        """Securely fetch user entities from database with SQL injection protection."""
        cache_key = f"entities_{hashlib.md5(user_id.encode()).hexdigest()}"
        
        # Check cache
        if cache_key in self._cache_store:
            cache_entry = self._cache_store[cache_key]
            if time.time() - cache_entry['timestamp'] < 300:  # 5 minute TTL
                self._resolution_stats['cache_hits'] += 1
                return cache_entry['data']
        
        # Fetch from database using parameterized queries
        entities = {}
        conn = None
        
        try:
            conn = self.db_pool.getconn()
            with conn.cursor() as cur:
                # User merchants (last 12 months)
                cur.execute("""
                    SELECT DISTINCT merchant_name 
                    FROM transactions 
                    WHERE user_id = %s 
                      AND merchant_name IS NOT NULL 
                      AND merchant_name != ''
                      AND date >= CURRENT_DATE - INTERVAL '12 months'
                    ORDER BY merchant_name 
                    LIMIT 100
                """, (user_id,))
                entities['user_merchants'] = [row[0] for row in cur.fetchall()]
                
                # User categories
                cur.execute("""
                    SELECT DISTINCT category 
                    FROM transactions 
                    WHERE user_id = %s 
                      AND category IS NOT NULL 
                      AND category != ''
                      AND date >= CURRENT_DATE - INTERVAL '12 months'
                    ORDER BY category 
                    LIMIT 50
                """, (user_id,))
                entities['user_categories'] = [row[0] for row in cur.fetchall()]
                
                # User accounts
                cur.execute("""
                    SELECT DISTINCT name 
                    FROM accounts 
                    WHERE user_id = %s 
                      AND name IS NOT NULL 
                      AND name != ''
                      AND is_active = true
                    ORDER BY name 
                    LIMIT 50
                """, (user_id,))
                entities['user_account_names'] = [row[0] for row in cur.fetchall()]
                
                # User budgets
                cur.execute("""
                    SELECT DISTINCT name 
                    FROM budgets 
                    WHERE user_id = %s 
                      AND name IS NOT NULL 
                      AND name != ''
                    ORDER BY name 
                    LIMIT 30
                """, (user_id,))
                entities['user_budget_names'] = [row[0] for row in cur.fetchall()]
                
                # User goals
                cur.execute("""
                    SELECT DISTINCT name 
                    FROM goals 
                    WHERE user_id = %s 
                      AND name IS NOT NULL 
                      AND name != ''
                      AND is_active = true
                    ORDER BY name 
                    LIMIT 20
                """, (user_id,))
                entities['user_goal_names'] = [row[0] for row in cur.fetchall()]
        
        except Exception as e:
            logger.error(f"Failed to fetch entities for user {user_id[:8]}...: {e}")
            entities = {}  # Return empty on error
        
        finally:
            if conn:
                self.db_pool.putconn(conn)
        
        # Cache result
        self._cache_store[cache_key] = {
            'data': entities,
            'timestamp': time.time()
        }
        
        return entities
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get resolution statistics for monitoring."""
        total = max(1, self._resolution_stats['total_resolutions'])
        return {
            **self._resolution_stats,
            'success_rate': self._resolution_stats['successful_matches'] / total,
            'fuzzy_match_rate': self._resolution_stats['fuzzy_matches'] / total,
            'cache_hit_rate': self._resolution_stats['cache_hits'] / total,
            'validation_failure_rate': self._resolution_stats['validation_failures'] / total,
            'supported_entity_types': [t.value for t in EntityType],
            'fuzzy_threshold': self.fuzzy_threshold
        }
    
    def clear_cache(self, user_id: Optional[str] = None):
        """Clear entity cache."""
        if user_id:
            cache_key = f"entities_{hashlib.md5(user_id.encode()).hexdigest()}"
            self._cache_store.pop(cache_key, None)
        else:
            self._cache_store.clear()

# Legacy compatibility function
def resolve_entities(query: str, entity_cache: Dict[str, Set[str]], cutoff: float = 0.7) -> Dict[str, List[str]]:
    """
    Legacy compatibility function for existing code.
    Provides basic entity resolution without full security features.
    """
    # Create a basic resolver instance
    resolver = EntityResolverV3(None, cutoff)
    
    # Convert old format to new format
    results = {}
    
    # Simple merchant name matching for backwards compatibility
    merchant_names = entity_cache.get('merchant_names', set())
    if merchant_names:
        resolved_merchants = []
        query_lower = query.lower()
        
        for merchant in merchant_names:
            if merchant.lower() in query_lower:
                resolved_merchants.append(merchant)
        
        if resolved_merchants:
            results['merchant_names'] = resolved_merchants
    
    return results