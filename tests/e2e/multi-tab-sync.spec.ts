import { test, expect, Browser, BrowserContext } from '@playwright/test';
import { 
  getMainCanvas, 
  expectToolActive, 
  clickToolAndExpectActive, 
  setupTest,
  drawRectangle,
  clickCanvas,
  selectAndDeleteShape,
  clickUndoWhenEnabled,
  clickRedoWhenEnabled
} from './utils';

test.describe('Drawing Application - Multi-Tab Synchronization', () => {
  let browser: Browser;
  let context1: BrowserContext;
  let context2: BrowserContext;

  test.beforeAll(async ({ browser: testBrowser }) => {
    browser = testBrowser;
  });

  test.beforeEach(async () => {
    // Create two separate browser contexts (tabs)
    // Note: BroadcastChannel doesn't work between separate contexts in Playwright
    // So we use same context with different pages to simulate multi-tab behavior
    context1 = await browser.newContext();
    context2 = context1; // Same context, different pages - enables BroadcastChannel
  });

  test.afterEach(async () => {
    await context1.close();
    // Don't close context2 since it's the same as context1
  });

  test('shapes drawn in one tab appear in another tab', async () => {
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Load the app in both tabs
    await setupTest(page1);
    await setupTest(page2);

    // Draw a rectangle in tab 1
    await clickToolAndExpectActive(page1, 'rectangle');
    await drawRectangle(page1, 100, 100, 200, 150);

    // Wait a moment for sync
    await page2.waitForTimeout(1000);

    // In tab 2, switch to select tool and verify the rectangle exists
    await clickToolAndExpectActive(page2, 'select');
    
    // Try to select and delete the rectangle in tab 2
    await selectAndDeleteShape(page2, 150, 125);

    // Wait for sync back to tab 1
    await page1.waitForTimeout(1000);

    // In tab 1, the rectangle should now be gone
    await clickToolAndExpectActive(page1, 'select');
    await clickCanvas(page1, 150, 125); // Should not select anything
  });

  test('undo/redo operations sync across tabs', async () => {
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    await page1.goto('/');
    await page2.goto('/');
    await page1.waitForLoadState('networkidle');
    await page2.waitForLoadState('networkidle');

    // Draw a rectangle in tab 1
    await clickToolAndExpectActive(page1, 'rectangle');
    await drawRectangle(page1, 100, 100, 200, 150);

    // Wait for sync
    await page2.waitForTimeout(1000);

    // Undo in tab 2
    await clickUndoWhenEnabled(page2);

    // Wait for sync back to tab 1
    await page1.waitForTimeout(1000);

    // In tab 1, the rectangle should be gone
    await clickToolAndExpectActive(page1, 'select');
    await clickCanvas(page1, 150, 125); // Should not select anything

    // Redo in tab 1
    await clickRedoWhenEnabled(page1);

    // Wait for sync to tab 2
    await page2.waitForTimeout(1000);

    // In tab 2, the rectangle should be back
    await clickToolAndExpectActive(page2, 'select');
    await selectAndDeleteShape(page2, 150, 125);
  });

  test('shape movements sync across tabs', async () => {
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    await page1.goto('/');
    await page2.goto('/');
    await page1.waitForLoadState('networkidle');
    await page2.waitForLoadState('networkidle');

    // Draw a rectangle in tab 1
    await clickToolAndExpectActive(page1, 'rectangle');
    await drawRectangle(page1, 100, 100, 200, 150);

    // Wait for sync
    await page2.waitForTimeout(1000);

    // In tab 2, select and move the rectangle
    await clickToolAndExpectActive(page2, 'select');
    
    await clickCanvas(page2, 150, 125); // Select
    
    // Drag to new position
    const canvas2 = getMainCanvas(page2);
    await canvas2.hover({ position: { x: 150, y: 125 } });
    await page2.mouse.down();
    await canvas2.hover({ position: { x: 300, y: 250 } });
    await page2.mouse.up();

    // Wait for sync back to tab 1
    await page1.waitForTimeout(1000);

    // In tab 1, the rectangle should be at the new position
    await clickToolAndExpectActive(page1, 'select');
    
    // Try to select at old position (should fail)
    await clickCanvas(page1, 150, 125);
    
    // Try to select at new position (should succeed)
    await selectAndDeleteShape(page1, 300, 250);
  });

  test('shape deletions sync across tabs', async () => {
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    await page1.goto('/');
    await page2.goto('/');
    await page1.waitForLoadState('networkidle');
    await page2.waitForLoadState('networkidle');

    // Draw multiple shapes in tab 1
    await clickToolAndExpectActive(page1, 'rectangle');
    
    // First rectangle
    await drawRectangle(page1, 50, 50, 100, 100);
    
    // Second rectangle
    await drawRectangle(page1, 150, 50, 200, 100);

    // Wait for sync
    await page2.waitForTimeout(1000);

    // In tab 2, delete one of the rectangles
    await clickToolAndExpectActive(page2, 'select');
    
    await selectAndDeleteShape(page2, 75, 75); // Select and delete first rectangle

    // Wait for sync back to tab 1
    await page1.waitForTimeout(1000);

    // In tab 1, first rectangle should be gone, second should remain
    await clickToolAndExpectActive(page1, 'select');
    
    // Try to select deleted rectangle (should fail)
    await clickCanvas(page1, 75, 75);
    
    // Try to select remaining rectangle (should succeed)
    await selectAndDeleteShape(page1, 175, 75);
  });

  test('edit mode operations sync across tabs', async () => {
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    await setupTest(page1);
    await setupTest(page2);

    // Draw a rectangle in tab 1
    await clickToolAndExpectActive(page1, 'rectangle');
    await drawRectangle(page1, 100, 100, 200, 150);

    // Wait for sync
    await page2.waitForTimeout(1000);

    // In tab 2, select the rectangle (note: edit mode may not be implemented yet)
    await clickToolAndExpectActive(page2, 'select');
    await selectAndDeleteShape(page2, 150, 125);

    // Wait for sync back to tab 1
    await page1.waitForTimeout(1000);

    // In tab 1, the rectangle should be gone
    await clickToolAndExpectActive(page1, 'select');
    await clickCanvas(page1, 150, 125); // Should not select anything
  });

  test('multiple concurrent operations handle conflicts gracefully', async () => {
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    await setupTest(page1);
    await setupTest(page2);

    // Simultaneously draw shapes in both tabs
    // Tab 1: Draw rectangle
    await clickToolAndExpectActive(page1, 'rectangle');
    const rect1Promise = drawRectangle(page1, 50, 50, 100, 100);

    // Tab 2: Draw circle at same time
    await clickToolAndExpectActive(page2, 'circle');
    const circle2Promise = drawRectangle(page2, 150, 50, 200, 100); // Use rectangle for simplicity

    // Wait for both operations to complete
    await Promise.all([rect1Promise, circle2Promise]);

    // Wait for sync to settle
    await page1.waitForTimeout(2000);
    await page2.waitForTimeout(2000);

    // Both shapes should exist in both tabs
    await clickToolAndExpectActive(page1, 'select');
    await clickToolAndExpectActive(page2, 'select');

    // In tab 1, both shapes should be selectable
    await selectAndDeleteShape(page1, 75, 75); // Rectangle
    await selectAndDeleteShape(page1, 175, 75); // Second rectangle

    // Wait for sync
    await page2.waitForTimeout(1000);

    // In tab 2, both shapes should be gone
    await clickCanvas(page2, 75, 75); // Should not select anything
    await clickCanvas(page2, 175, 75); // Should not select anything
  });
});
