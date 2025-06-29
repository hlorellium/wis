# Playwright E2E Testing Setup

This document describes the comprehensive Playwright end-to-end testing infrastructure for the drawing application.

## Overview

We've implemented a robust E2E testing strategy using Playwright to ensure the application works correctly across different browsers and scenarios. The tests cover:

- Basic application functionality
- Drawing and editing workflows  
- Multi-tab synchronization
- Persistence and recovery scenarios

## Test Structure

```
tests/e2e/
├── app-loads.spec.ts        # Basic app functionality
├── drawing-flow.spec.ts     # Drawing and editing workflows
├── multi-tab-sync.spec.ts   # Multi-tab synchronization tests
└── persistence.spec.ts      # Persistence and recovery tests
```

## Configuration

### Playwright Configuration (`playwright.config.ts`)

- **Test Directory**: `./tests/e2e`
- **Base URL**: `http://localhost:5173` (Vite dev server)
- **Browsers**: Chromium, Firefox, WebKit
- **Reporters**: HTML report + JSON output
- **Features**:
  - Automatic dev server startup
  - Screenshot/video capture on failures
  - Trace collection for debugging
  - Parallel test execution

### Package Scripts

```json
{
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "test:e2e:debug": "playwright test --debug", 
  "test:e2e:headed": "playwright test --headed",
  "test:all": "bun run test && bun run test:e2e"
}
```

## Test Categories

### 1. Basic Application Tests (`app-loads.spec.ts`)

**Purpose**: Verify fundamental app functionality

**Tests**:
- App loads and displays UI elements
- Canvas has correct dimensions
- Default tool selection
- Tool switching functionality
- Console error detection

**Key Selectors**:
- Canvas: `#canvas` (main drawing canvas)
- Tools: `[data-tool="toolname"]` with `aria-pressed="true"` for active state
- Actions: `[data-action="undo"]`, `[data-action="redo"]`

### 2. Drawing Flow Tests (`drawing-flow.spec.ts`)

**Purpose**: Test complete drawing and editing workflows

**Tests**:
- Drawing shapes (rectangle, circle, line, bezier)
- Shape selection and movement
- Undo/redo functionality
- Multi-select with drag selection
- Edit mode transitions and shape editing

**Key Interactions**:
- Mouse hover, down, move, up for drawing
- Click for selection
- Double-click for edit mode
- Keyboard shortcuts for deletion

### 3. Multi-Tab Synchronization Tests (`multi-tab-sync.spec.ts`)

**Purpose**: Verify real-time synchronization across browser tabs

**Tests**:
- Shape creation sync
- Undo/redo operation sync
- Shape movement sync
- Shape deletion sync
- Edit mode operation sync
- Concurrent operation handling

**Setup**:
- Creates separate browser contexts for each tab
- Tests real BroadcastChannel behavior
- Includes sync timing with `waitForTimeout()`

### 4. Persistence Tests (`persistence.spec.ts`)

**Purpose**: Test data persistence and recovery scenarios

**Tests**:
- Drawing persistence after page reload
- Undo/redo history persistence
- IndexedDB unavailability handling
- Corrupted storage data recovery
- Large drawing persistence
- Cross-session persistence
- Rapid save/load cycle handling

**Error Scenarios**:
- Mock IndexedDB failures
- Corrupt localStorage data
- Network connection issues

## Best Practices

### 1. Canvas Testing Approach

```typescript
// Use specific canvas selector
const canvas = page.locator('#canvas');

// Hover before mouse operations
await canvas.hover({ position: { x: 100, y: 100 } });
await page.mouse.down();
await canvas.hover({ position: { x: 200, y: 150 } });
await page.mouse.up();
```

### 2. Tool State Verification

```typescript
// Check tool activation using aria-pressed
await expect(page.locator('[data-tool="rectangle"]'))
  .toHaveAttribute('aria-pressed', 'true');
```

### 3. Shape Interaction Testing

```typescript
// Draw shape -> Switch to select -> Test interaction -> Verify result
await page.click('[data-tool="rectangle"]');
// ... draw shape ...
await page.click('[data-tool="select"]');
await canvas.click({ position: { x: 150, y: 125 } });
await page.keyboard.press('Delete');
```

### 4. Multi-Tab Testing Pattern

```typescript
const page1 = await context1.newPage();
const page2 = await context2.newPage();
// ... perform action in page1 ...
await page2.waitForTimeout(1000); // Allow sync time
// ... verify result in page2 ...
```

### 5. Error Handling

```typescript
// Monitor console errors
const consoleErrors: string[] = [];
page.on('console', msg => {
  if (msg.type() === 'error') {
    consoleErrors.push(msg.text());
  }
});
```

## Running Tests

### Local Development

```bash
# Run all E2E tests
bun run test:e2e

# Run with UI (interactive mode)
bun run test:e2e:ui

# Run in headed mode (see browser)
bun run test:e2e:headed

# Debug specific test
bun run test:e2e:debug -- tests/e2e/app-loads.spec.ts

# Run specific test file
bun run test:e2e -- tests/e2e/drawing-flow.spec.ts
```

### CI/CD Integration

The configuration automatically:
- Starts the dev server (`bun run dev`)
- Runs tests in parallel
- Captures screenshots/videos on failure
- Generates HTML reports
- Retries failed tests (2x in CI)

## Debugging Failed Tests

### 1. Screenshots and Videos

Failed tests automatically capture:
- Screenshots at the point of failure
- Video recordings of the entire test
- Traces for step-by-step debugging

### 2. HTML Report

```bash
# View HTML report after test run
npx playwright show-report
```

### 3. Debug Mode

```bash
# Run in debug mode with browser tools
bun run test:e2e:debug -- tests/e2e/specific-test.spec.ts
```

### 4. Trace Viewer

```bash
# View traces for detailed debugging
npx playwright show-trace test-results/trace.zip
```

## Common Issues and Solutions

### 1. Canvas Element Conflicts

**Issue**: Multiple canvas elements (`#bg-canvas`, `#canvas`)
**Solution**: Use specific selector `#canvas` for main drawing canvas

### 2. Tool State Detection

**Issue**: Tests expecting CSS classes for active tools
**Solution**: Use `aria-pressed="true"` attribute instead

### 3. Timing Issues

**Issue**: Sync operations not completing before assertions
**Solution**: Use `waitForTimeout()` after operations that trigger sync

### 4. Browser-Specific Failures

**Issue**: Tests pass in some browsers but fail in others
**Solution**: Check browser-specific behavior and adjust selectors/timing

## Coverage and Quality

### Test Coverage Areas

- ✅ Basic UI functionality
- ✅ All drawing tools
- ✅ Selection and editing
- ✅ Undo/redo operations
- ✅ Multi-tab synchronization
- ✅ Persistence scenarios
- ✅ Error handling and recovery

### Quality Metrics

- Cross-browser compatibility (Chromium, Firefox, WebKit)
- Real user interaction simulation
- Network and storage failure scenarios
- Performance under load (large drawings)
- Concurrent user simulation (multi-tab)

## Future Enhancements

### Potential Additions

1. **Visual Regression Testing**: Screenshot comparison for UI changes
2. **Performance Testing**: Measure rendering performance with large datasets
3. **Mobile Testing**: Touch interaction testing on mobile viewports
4. **Accessibility Testing**: Screen reader and keyboard navigation tests
5. **API Testing**: Backend integration tests (if applicable)

### Advanced Scenarios

1. **Complex Drawing Workflows**: Multi-step drawing with tool combinations
2. **Stress Testing**: Hundreds of shapes with rapid operations
3. **Network Simulation**: Offline/online state changes
4. **Memory Testing**: Long-running sessions with memory monitoring

## Conclusion

This Playwright setup provides comprehensive E2E testing coverage for the drawing application, ensuring reliability across browsers and real-world usage scenarios. The tests serve as both quality assurance and documentation of expected application behavior.
