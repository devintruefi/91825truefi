# Render Pipeline - End-to-End Flow

**Date**: 2025-09-25
**Branch**: fix-dockerfile
**Commit**: 3cb52b172c1d9e0e33995ecfe1e5ec05e2f019f6
**Author**: Claude Code (automated audit)

## Pipeline Overview

The rendering pipeline processes GPT-5 responses through multiple stages of transformation before final display.

## Stage 1: GPT-5 Response Generation

### Location: `TRUEFIBACKEND/agents/gpt5_unified_agent.py`

**Function**: `_call_gpt5_responses_api` (lines 434-492)

```python
async def _call_gpt5_responses_api(self, user_message: str) -> str:
    url = 'https://api.openai.com/v1/responses'
    data = {
        'model': 'gpt-5',
        'instructions': self.system_prompt,
        'input': user_message,
        'store': True,
        'reasoning': {'effort': config.GPT5_REASONING_EFFORT},
        'text': {'verbosity': config.GPT5_VERBOSITY}
    }
```

**Data Shape**: Raw JSON response with potential formatting issues

## Stage 2: Response Parsing & Repair

### Location: `TRUEFIBACKEND/agents/gpt5_unified_agent.py`

**Function**: `_parse_gpt5_response` (lines 494-523)

```python
def _parse_gpt5_response(self, content: str, profile_pack: Dict[str, Any]) -> Dict[str, Any]:
    # First handle escaped newlines in the raw JSON string
    if '\\n' in content:
        content = content.replace('\\n', '\n')

    # Fix any broken formatting in the raw response
    content = self._fix_broken_response_formatting(content)
```

**Transformations**:
1. Replace literal `\n` with actual newlines
2. Detect and fix character-per-line formatting
3. Extract JSON block or fallback to markdown

## Stage 3: Markdown Formatting

### Location: `TRUEFIBACKEND/agents/gpt5_unified_agent.py`

**Function**: `_fix_markdown_formatting` (lines 793-875)

Key transformations:
- Fix broken multi-line formatting
- Fix split numbers: `305\n,\n176` → `305,176`
- Add spaces: `$160,000salary` → `$160,000 salary`
- Escape underscores/asterisks: `WELLS_FARGO` → `WELLS\_FARGO`
- Fix spaced thousands: `4, 000` → `4,000`

## Stage 4: Orchestrator Processing

### Location: `TRUEFIBACKEND/orchestrator_gpt5.py`

**Function**: `process_question` (lines 61-117)

```python
# Step 3: Process with GPT-5 unified agent
result = await self.gpt5_agent.process_request(
    question=question,
    profile_pack=profile_pack,
    user_id=user_id
)

return {
    'success': True,
    'result': result,
    'execution_time_ms': execution_time
}
```

**Output Shape**:
```json
{
  "success": true,
  "result": {
    "answer_markdown": "...",
    "ui_blocks": [...],
    "computations": [...],
    "assumptions": [...]
  },
  "execution_time_ms": 5000
}
```

## Stage 5: Backend Final Processing

### Location: `TRUEFIBACKEND/main.py`

**Function**: `chat` endpoint (lines 923-1073)

```python
# Extract the result with rich content
result = orchestrator_result.get('result', {})
response_text = result.get('answer_markdown', 'I encountered an issue...')

# Add advisor framing for better UX
response_text = add_advisor_framing(response_text, result)
```

**Function**: `sanitize_markdown` (lines 283-347)

Key operations:
- Remove zero-width characters
- Reflow paragraphs
- Fix soft line breaks
- Space letters/digits: `Form1099` → `Form 1099`
- Fix spaced thousands

## Stage 6: API Response

### Location: `TRUEFIBACKEND/main.py`

**Response Shape** (lines 1061-1073):
```python
return {
    "message": response_text + freshness_note,
    "session_id": valid_session_id,
    "agent_used": "gpt5_unified",
    "rich_content": rich_content,
    "metadata": {...}
}
```

## Stage 7: Frontend API Route

### Location: `app/api/chat/route.ts`

**Function**: `POST` (lines 6-138)

```typescript
const response = await fetch(`${backendUrl}${endpoint}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
        message: message,
        session_id: sessionId,
        conversation_history: []
    }),
    signal: controller.signal,
})
```

**Timeout**: 720000ms (12 minutes)

## Stage 8: Frontend Component Routing

### Decision Points:
1. **Dashboard View** → `components/chat/penny-response-renderer.tsx`
2. **Chat Interface** → `components/apple-chat-interface.tsx`
3. **Legacy Chat** → `components/chat-interface.tsx`

## Stage 9: Content Extraction

### Location: `components/apple-chat-interface.tsx`

**Lines 1229-1249**:
```typescript
// Extract message content and metadata from response
const rawContent = data.content || data.message || data.response

// Check if we're getting the metadata/rich_content as the message
if (typeof rawContent === 'string' && rawContent.includes('"answer_markdown":')) {
    // The entire JSON structure is being returned as message string
    const parsed = JSON.parse(rawContent)
    aiResponseContent = parsed.answer_markdown || parsed.message || rawContent
}
```

## Stage 10: Markdown Rendering

### Component-Specific Configurations:

**penny-response-renderer.tsx**:
- Plugins: `remarkGfm`, `remarkBreaks`
- Wrapper: `<div className="prose prose-base ... markdown-content tabular-nums">`

**apple-chat-interface.tsx**:
- Plugins: `remarkGfm`, `remarkBreaks`, `remarkMath`
- Wrapper: `<div className="prose ... markdown-content tabular-nums break-words">`

**chat-interface.tsx**:
- Plugins: `remarkGfm`, `remarkMath`
- Wrapper: None (direct ReactMarkdown)

## Stage 11: CSS Application

### Global Styles:
- `app/globals.css` - Main application styles
- `styles/globals.css` - Legacy styles (should be removed)

### Typography Classes:
- `.prose` - Tailwind Typography plugin
- `.markdown-content` - Custom markdown hardening
- `.tabular-nums` - Fixed-width numbers

## Data Flow Example

```
Input: "Show my spending at Trader Joe's"
↓
GPT-5: {"answer_markdown": "You spent $69,375across15transactions..."}
↓
Parse: Replace \n, fix broken formatting
↓
Format: Add spaces, escape special chars
↓
Sanitize: Remove zero-widths, reflow text
↓
Frame: Add advisor context
↓
API: {"message": "### Your Spending\n\nYou spent $69,375 across 15..."}
↓
Frontend: Extract from data.message
↓
Scrub: Remove zero-width chars (client-side)
↓
Markdown: Parse with remark/rehype plugins
↓
Render: Apply CSS classes and display
```

## Critical Path Issues

1. **Multiple sanitization layers** can conflict
2. **Escaped newlines** from GPT-5 need proper handling
3. **Component routing** determines which renderer & plugins
4. **CSS cascade** depends on import order of two globals.css files