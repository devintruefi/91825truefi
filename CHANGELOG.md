# Changelog

## [2024-12-31] - Fixed Initial Step Drift & Fallback

### Fixed
- **Initial step drift** - Fixed issue where first interactive step after consent could show wrong component
  - Auto-advance from `welcome` to `main_goal` server-side to ensure consistency
  - First interactive card now always shows Main Financial Goal buttons
  
- **Client-server synchronization** - Improved state consistency between client and server
  - Client now properly echoes `stepId`, `instanceId`, and `nonce` from payload
  - Added `/api/onboarding/v2/resync` endpoint for OUT_OF_SYNC recovery
  - 409 errors trigger automatic resync instead of showing fallback UI
  
- **Unified progress tracking** - Progress header now derives from same payload as component
  - `stepIndex` and `itemsCollected` come directly from server response
  - No more client-side computation causing drift

### Added
- New `OnboardingV2Client` component with proper error handling and resync
- Component data (`component` field) included in all API responses
- `buildStepComponent` helper to generate component data for each step
- Comprehensive test suite for drift scenarios
- First payload sample documentation in `canonical-v2.ts`

### Removed
- Generic "Looks like that didn't load properly" fallback card
- Client-side progress calculations that could drift from server

## [2024-08-30] - TrueFi.ai Chat Onboarding Fixes

### Fixed
- **Progress Header**: Fixed stuck "Step 1 of 9 / 0% Complete" - now correctly calculates using canonical ORDERED_STEPS
- **State Sync**: Implemented nonce/stepInstanceId contract to prevent OUT_OF_SYNC errors
- **Income Detection**: Fixed empty income capture - now properly detects and suggests income from Plaid data
- **Budget Defaults**: Budget pie chart no longer shows 0% - uses sensible defaults or Plaid data
- **Debt Capture**: Merged duplicate debt capture steps into single `debts_detail` step
- **Emergency Fund**: Fixed ambiguous slider - now clearly shows "months of expenses" with current/target
- **Plaid Reconnection**: Prevent Plaid card from reappearing after successful connection
- **Error Handling**: Removed raw JSON/stack traces - all errors now show friendly conversational messages

### Added
- **Canonical Step Engine**: Single source of truth with ORDERED_STEPS and STEP_CONFIG
- **Plaid Suggestions API**: `/api/onboarding/suggestions` endpoint for async Plaid data processing
- **Test Mode**: TEST_MODE=true provides deterministic sandbox data for E2E testing
- **Income Detection Heuristics**: Analyzes transactions for payroll/salary with frequency detection
- **Budget Baseline Mapping**: Maps Plaid categories to TrueFi budget buckets
- **Net Worth Calculation**: Automatic calculation from connected accounts
- **Risk Capacity Hints**: Intelligent suggestions based on income stability and emergency fund

### Changed
- Progress calculation now uses `currentIndex / (total - 1) * 100` formula
- All interactive messages include stepId, componentType, data, and meta (nonce, stepInstanceId)
- Client cancels in-flight requests when new assistant message arrives
- Emergency fund displays in months with clear current/recommended values
- Jurisdiction uses country/state codes (US-CA, CA-ON) not freeform text

### Security
- All state transitions validated against canonical step order
- Stale component submissions rejected with 409 status
- User data properly isolated with JWT authentication
- No hardcoded thresholds or business logic

### Documentation
- Added README-onboarding.md with sandbox credentials and test instructions
- Documented TEST_MODE for headless journey testing
- Clear error recovery patterns for 409 responses