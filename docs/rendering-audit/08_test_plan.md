# Test Plan - Verification Strategy

**Date**: 2025-09-25
**Branch**: fix-dockerfile
**Commit**: 3cb52b172c1d9e0e33995ecfe1e5ec05e2f019f6
**Author**: Claude Code (automated audit)

## Test Categories

### 1. Unit Tests
Test individual formatting functions in isolation

### 2. Integration Tests
Test the complete rendering pipeline

### 3. Visual Regression Tests
Detect unintended visual changes

### 4. Performance Tests
Measure rendering speed and resource usage

### 5. E2E Tests
Verify complete user flows

## Unit Test Suite

### Backend Formatter Tests

#### Test: Character Reconstruction
```python
def test_character_reconstruction():
    """Test fixing character-per-line formatting"""

    # Test case 1: Broken dollar amount
    broken = "Y\no\nu\n \ns\np\ne\nn\nt\n \n$\n6\n9\n,\n3\n7\n5"
    expected = "You spent $69,375"
    assert fix_broken_response_formatting(broken) == expected

    # Test case 2: Mixed broken and normal
    mixed = "Normal text\nB\nr\no\nk\ne\nn\nMore normal"
    expected = "Normal text\nBroken\nMore normal"
    assert fix_broken_response_formatting(mixed) == expected

    # Test case 3: Should not trigger
    normal = "This is\na normal\nmultiline text"
    assert fix_broken_response_formatting(normal) == normal
```

#### Test: Markdown Formatting
```python
def test_markdown_formatting():
    """Test markdown-specific fixes"""

    test_cases = [
        # Split numbers
        ("305\n,\n176", "305,176"),

        # Dollar amounts
        ("$ 100", "$100"),
        ("$160,000salary", "$160,000 salary"),

        # Underscores
        ("WELLS_FARGO", "WELLS\\_FARGO"),

        # Spaced thousands
        ("4, 000", "4,000"),

        # Letter-digit spacing
        ("Form1099", "Form 1099"),
        ("avg4,625", "avg 4,625")
    ]

    for input_text, expected in test_cases:
        assert fix_markdown_formatting(input_text) == expected
```

#### Test: Unicode Sanitization
```python
def test_unicode_sanitization():
    """Test removal of problematic Unicode characters"""

    # Zero-width characters
    text = "Hello\u200bWorld\u200c!\u200d"
    expected = "HelloWorld!"
    assert sanitize_markdown(text) == expected

    # Thin spaces
    text = "Number\u2009123\u202f456"
    expected = "Number 123 456"
    assert sanitize_markdown(text) == expected
```

### Frontend Scrub Tests

#### Test: Scrub Function
```typescript
describe('scrub function', () => {
  test('removes zero-width characters', () => {
    const input = 'Hello\u200bWorld\u200c!'
    const expected = 'HelloWorld!'
    expect(scrub(input)).toBe(expected)
  })

  test('normalizes spaces', () => {
    const input = 'Thin\u2009space\u202fhere'
    const expected = 'Thin space here'
    expect(scrub(input)).toBe(expected)
  })
})
```

### UI Block Tests

#### Test: KPI Card Rendering
```typescript
describe('KPI Card', () => {
  test('renders with all props', () => {
    const block = {
      type: 'kpi_card',
      title: 'Monthly Income',
      data: {
        value: 5000,
        formatted_value: '$5,000',
        change: '+10%',
        change_type: 'positive'
      }
    }

    const { getByText } = render(<KPICard block={block} />)
    expect(getByText('Monthly Income')).toBeInTheDocument()
    expect(getByText('$5,000')).toBeInTheDocument()
    expect(getByText('+10%')).toBeInTheDocument()
  })

  test('handles missing data gracefully', () => {
    const block = { type: 'kpi_card', data: {} }
    expect(() => render(<KPICard block={block} />)).not.toThrow()
  })
})
```

## Integration Test Suite

### Pipeline Test
```python
async def test_complete_pipeline():
    """Test complete formatting pipeline"""

    # GPT-5 raw response
    raw_response = '''
    {
        "answer_markdown": "You spent $69,\\n375 across\\n15\\ntransactions"
    }
    '''

    # Process through pipeline
    step1 = replace_escaped_newlines(raw_response)
    step2 = fix_broken_response_formatting(step1)
    step3 = parse_json(step2)
    step4 = fix_markdown_formatting(step3['answer_markdown'])
    step5 = sanitize_markdown(step4)

    expected = "You spent $69,375 across 15 transactions"
    assert step5 == expected
```

### Renderer Integration
```typescript
describe('Markdown Renderer Integration', () => {
  test('consistent rendering across components', () => {
    const content = '# Title\n\nParagraph with $1,000\n\n- List item'

    const penny = render(<PennyResponseRenderer content={content} />)
    const apple = render(<AppleChatInterface messages={[{content}]} />)

    // Should have same structure
    expect(penny.container.querySelector('h1')).toHaveTextContent('Title')
    expect(apple.container.querySelector('h1')).toHaveTextContent('Title')
  })
})
```

## Visual Regression Tests

### Setup with Playwright
```typescript
// playwright.config.ts
export default {
  projects: [
    {
      name: 'visual-regression',
      use: {
        viewport: { width: 1280, height: 720 }
      }
    }
  ]
}
```

### Visual Tests
```typescript
test('markdown rendering visual consistency', async ({ page }) => {
  await page.goto('/test/markdown-samples')

  // Test each renderer
  const renderers = ['penny', 'apple', 'chat']

  for (const renderer of renderers) {
    await page.click(`#show-${renderer}`)
    await expect(page).toHaveScreenshot(`${renderer}-markdown.png`)
  }
})
```

## Performance Test Suite

### Rendering Performance
```typescript
describe('Performance', () => {
  test('renders large content efficiently', () => {
    const largeContent = 'Lorem ipsum...'.repeat(1000)

    const start = performance.now()
    render(<UnifiedMarkdownRenderer content={largeContent} />)
    const end = performance.now()

    expect(end - start).toBeLessThan(100) // Should render in <100ms
  })

  test('memoizes expensive operations', () => {
    const spy = jest.spyOn(React, 'useMemo')
    const { rerender } = render(<Component content="test" />)

    rerender(<Component content="test" />)
    expect(spy).toHaveBeenCalled()
  })
})
```

### Backend Performance
```python
def test_formatter_performance():
    """Test formatting performance with large text"""
    import time

    large_text = "Test text " * 10000  # ~90KB of text

    start = time.time()
    result = sanitize_markdown(large_text)
    elapsed = time.time() - start

    assert elapsed < 0.1  # Should process in <100ms
```

## E2E Test Suite

### User Flow Tests
```typescript
test('complete chat flow', async ({ page }) => {
  // Navigate to chat
  await page.goto('/chat')

  // Send message
  await page.fill('#message-input', 'Show my spending')
  await page.click('#send-button')

  // Wait for response
  await page.waitForSelector('.markdown-content')

  // Verify formatting
  const content = await page.textContent('.markdown-content')
  expect(content).not.toContain('\\n')  // No escaped newlines
  expect(content).toMatch(/\$[\d,]+/)   // Properly formatted dollars
})
```

## Test Data Sets

### Edge Cases
```javascript
const TEST_CASES = {
  // Broken formatting
  characterPerLine: "T\ne\ns\nt",

  // Special characters
  underscores: "WELLS_FARGO_BANK",
  asterisks: "**bold** and *italic*",

  // Numbers
  splitNumbers: "69,\n375.00",
  spacedThousands: "4, 000, 000",

  // Mixed content
  codeAndText: "```\ncode\n```\nText here",

  // Unicode
  zeroWidth: "Test\u200bString",
  emoji: "😀 Test 🎉",

  // Large content
  performance: "x".repeat(100000)
}
```

## Test Automation

### CI/CD Pipeline
```yaml
# .github/workflows/test.yml
name: Test Rendering Pipeline

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Install dependencies
        run: |
          npm ci
          pip install -r requirements.txt

      - name: Run unit tests
        run: |
          npm test
          pytest tests/

      - name: Run integration tests
        run: npm run test:integration

      - name: Visual regression tests
        run: npx playwright test

      - name: Performance tests
        run: npm run test:performance
```

## Monitoring & Metrics

### Key Metrics to Track
```typescript
const METRICS = {
  // Performance
  markdownRenderTime: 'p95 < 100ms',
  formatPipelineTime: 'p95 < 50ms',

  // Reliability
  renderErrorRate: '< 0.1%',
  malformedBlockRate: '< 1%',

  // User Experience
  timeToFirstRender: 'p50 < 200ms',
  characterReconstruction: 'success > 99%'
}
```

### Error Tracking
```typescript
// Sentry integration
Sentry.init({
  beforeSend(event) {
    if (event.exception?.values?.[0]?.type === 'MarkdownError') {
      // Track markdown rendering errors
      event.fingerprint = ['markdown-error']
    }
    return event
  }
})
```

## Manual Test Checklist

### Pre-Release Checklist
- [ ] Test with GPT-5 responses
- [ ] Verify dollar amounts format correctly
- [ ] Check table rendering
- [ ] Test math equations (KaTeX)
- [ ] Verify chart rendering
- [ ] Test with long responses (>10KB)
- [ ] Check dark mode
- [ ] Test on mobile devices
- [ ] Verify accessibility (screen readers)
- [ ] Test error scenarios

### Regression Tests
- [ ] Existing content renders unchanged
- [ ] UI blocks display correctly
- [ ] Links remain clickable
- [ ] Code blocks have syntax highlighting
- [ ] Lists maintain proper indentation
- [ ] Headers have correct sizing

## Success Criteria

### Functional
✅ All formatters produce expected output
✅ Renderers display content consistently
✅ No visible character artifacts
✅ Math equations render correctly

### Performance
✅ Render time < 100ms for typical content
✅ No memory leaks
✅ Smooth scrolling with large content

### Reliability
✅ Error rate < 0.1%
✅ Graceful degradation
✅ No crashes from malformed data

### User Experience
✅ No FOUT/FOIT
✅ Consistent typography
✅ Proper spacing and alignment
✅ Accessible to screen readers