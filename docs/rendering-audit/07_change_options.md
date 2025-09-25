# Change Options - Refactoring Proposals

**Date**: 2025-09-25
**Branch**: fix-dockerfile
**Commit**: 3cb52b172c1d9e0e33995ecfe1e5ec05e2f019f6
**Author**: Claude Code (automated audit)

## Option 1: Minimal Fix (1-2 days)

### Goal
Fix the most critical issues with minimal code changes

### Changes
1. **Unify Markdown Plugins**
   ```tsx
   // Create shared config
   const MARKDOWN_PLUGINS = {
     remark: [remarkGfm, remarkBreaks, remarkMath],
     rehype: [[rehypeKatex, { strict: true }], rehypeRaw, rehypeSanitize]
   }
   ```

2. **Remove Duplicate CSS**
   ```bash
   # Delete styles/globals.css
   # Move unique rules to app/globals.css
   ```

3. **Fix GPT-5 Character Detection**
   ```python
   # Lower threshold and add pattern matching
   if single_char_lines / len(lines) > 0.2 or \
      re.search(r'^.\n.\n.\n.\n', text):
       # Reconstruct
   ```

4. **Remove Font Override**
   ```css
   /* Delete the font-family override */
   ```

### Pros
- Quick to implement
- Low risk
- Immediate improvement

### Cons
- Doesn't address deeper issues
- Still have multiple renderers
- Performance issues remain

## Option 2: Unified Renderer (3-5 days)

### Goal
Create a single markdown renderer component

### Implementation
```tsx
// components/unified-markdown-renderer.tsx
interface UnifiedMarkdownProps {
  content: string
  variant?: 'chat' | 'dashboard' | 'legacy'
  showUIBlocks?: boolean
  metadata?: any
}

export function UnifiedMarkdownRenderer({
  content,
  variant = 'chat',
  showUIBlocks = true,
  metadata
}: UnifiedMarkdownProps) {
  const scrubbed = useMemo(() => scrub(content), [content])

  const config = RENDERER_CONFIGS[variant]

  return (
    <ErrorBoundary>
      <div className={config.wrapperClasses}>
        <ReactMarkdown
          remarkPlugins={config.remarkPlugins}
          rehypePlugins={config.rehypePlugins}
          components={config.components}
        >
          {scrubbed}
        </ReactMarkdown>
      </div>
      {showUIBlocks && <UIBlockRenderer blocks={metadata?.ui_blocks} />}
    </ErrorBoundary>
  )
}
```

### Migration Plan
1. Create new component
2. Add feature flags
3. Migrate one interface at a time
4. Remove old renderers

### Pros
- Single source of truth
- Consistent rendering
- Easier maintenance

### Cons
- Higher risk
- Requires careful testing
- May break existing UIs

## Option 3: Backend Formatting Service (1 week)

### Goal
Consolidate all text processing in backend

### Architecture
```python
class FormattingService:
    def __init__(self):
        self.formatters = [
            EscapeHandler(),
            CharacterReconstructor(),
            MarkdownFixer(),
            UnicodeSanitizer(),
            ParagraphReflower()
        ]

    def format(self, text: str, context: dict) -> str:
        for formatter in self.formatters:
            text = formatter.process(text, context)
        return text
```

### API Changes
```python
@app.post("/api/format")
async def format_text(request: FormatRequest):
    service = FormattingService()
    return {
        "formatted": service.format(
            request.text,
            {"source": request.source}
        )
    }
```

### Pros
- Centralized logic
- Testable pipeline
- Language agnostic

### Cons
- Significant refactor
- API changes needed
- Migration complexity

## Option 4: Component Library (2 weeks)

### Goal
Build proper component library for all UI elements

### Structure
```
packages/
├── ui-components/
│   ├── src/
│   │   ├── markdown/
│   │   ├── charts/
│   │   ├── blocks/
│   │   └── formatters/
│   └── package.json
└── app/
    └── package.json
```

### Components
```tsx
// @truefi/ui-components
export { MarkdownRenderer } from './markdown'
export { ChartBlock } from './charts'
export { KPICard } from './blocks'
export { useFormatter } from './formatters'
```

### Pros
- Proper separation
- Reusable components
- Type safety
- Storybook testing

### Cons
- Large effort
- Requires monorepo setup
- Team training needed

## Option 5: Streaming Architecture (2-3 weeks)

### Goal
Implement proper streaming for long responses

### Changes
1. **SSE Implementation**
   ```typescript
   // Server-sent events for streaming
   const eventSource = new EventSource('/api/stream')
   eventSource.onmessage = (event) => {
     const chunk = JSON.parse(event.data)
     appendToResponse(chunk)
   }
   ```

2. **Incremental Rendering**
   ```tsx
   function StreamingMarkdown({ stream }) {
     const [content, setContent] = useState('')

     useEffect(() => {
       stream.on('chunk', (chunk) => {
         setContent(prev => prev + chunk)
       })
     }, [])

     return <ReactMarkdown>{content}</ReactMarkdown>
   }
   ```

3. **Backend Chunking**
   ```python
   async def stream_response(text: str):
       chunks = split_into_chunks(text, 100)
       for chunk in chunks:
           yield format_chunk(chunk)
           await asyncio.sleep(0.01)
   ```

### Pros
- Better UX for long responses
- Reduced memory usage
- Progressive rendering

### Cons
- Complex implementation
- State management challenges
- Error handling complexity

## Recommended Approach

### Phase 1 (Week 1) - Critical Fixes
1. Implement Option 1 (Minimal Fix)
2. Add error boundaries
3. Fix GPT-5 character detection
4. Remove duplicate CSS

### Phase 2 (Week 2) - Unified Renderer
1. Build unified renderer (Option 2)
2. Add comprehensive tests
3. Deploy behind feature flag
4. Gradual rollout

### Phase 3 (Week 3-4) - Backend Service
1. Create formatting service (Option 3)
2. Migrate formatters incrementally
3. Add monitoring and metrics
4. Performance optimization

### Phase 4 (Month 2) - Component Library
1. Set up monorepo
2. Extract components (Option 4)
3. Add Storybook
4. Documentation

### Phase 5 (Month 3) - Streaming
1. Implement SSE (Option 5)
2. Update UI components
3. Add fallbacks
4. Load testing

## Migration Strategy

### Feature Flags
```typescript
const FEATURES = {
  USE_UNIFIED_RENDERER: process.env.NEXT_PUBLIC_UNIFIED_RENDERER === 'true',
  USE_BACKEND_FORMATTER: process.env.NEXT_PUBLIC_BACKEND_FORMATTER === 'true',
  ENABLE_STREAMING: process.env.NEXT_PUBLIC_STREAMING === 'true'
}
```

### Rollback Plan
1. Keep old code paths
2. Monitor error rates
3. A/B testing
4. Quick revert capability

### Testing Strategy
1. Unit tests for formatters
2. Integration tests for pipeline
3. Visual regression tests
4. Performance benchmarks
5. User acceptance testing

## Cost-Benefit Analysis

| Option | Cost (dev days) | Risk | Benefit | ROI |
|--------|----------------|------|---------|-----|
| Minimal Fix | 2 | Low | Medium | High |
| Unified Renderer | 5 | Medium | High | High |
| Backend Service | 7 | Medium | High | Medium |
| Component Library | 14 | Low | Very High | Medium |
| Streaming | 21 | High | Medium | Low |

## Decision Criteria

### Choose Minimal Fix if:
- Need immediate resolution
- Limited resources
- Risk averse

### Choose Unified Renderer if:
- Want consistent UX
- Have 1 week timeline
- Can test thoroughly

### Choose Backend Service if:
- Want centralized logic
- Have backend expertise
- Planning API v2

### Choose Component Library if:
- Long-term investment
- Multiple products
- Design system needed

### Choose Streaming if:
- Long response times
- User complaints about speed
- Have streaming infrastructure