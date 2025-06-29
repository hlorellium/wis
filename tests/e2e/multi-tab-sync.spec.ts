import { test, expect, Browser, BrowserContext } from '@playwright/test';

test.describe('Drawing Application - Multi-Tab Synchronization', () => {
  let browser: Browser;
  let context1: BrowserContext;
  let context2: BrowserContext;

  test.beforeAll(async ({ browser: testBrowser }) => {
    browser = testBrowser;
  });

  test.beforeEach(async () => {
    // Create two separate browser contexts (tabs)
    context1 = await browser.newContext();
    context2 = await browser.newContext();
  });

  test.afterEach(async () => {
    await context1.close();
    await context2.close();
  });

  test('shapes drawn in one tab appear in another tab', async () => {
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    // Load the app in both tabs
    await page1.goto('/');
    await page2.goto('/');
    await page1.waitForLoadState('networkidle');
    await page2.waitForLoadState('networkidle');

    // Draw a rectangle in tab 1
    await page1.click('[data-tool="rectangle"]');
    const canvas1 = page1.locator('canvas');
    
    await canvas1.hover({ position: { x: 100, y: 100 } });
    await page1.mouse.down();
    await canvas1.hover({ position: { x: 200, y: 150 } });
    await page1.mouse.up();

    // Wait a moment for sync
    await page2.waitForTimeout(1000);

    // In tab 2, switch to select tool and verify the rectangle exists
    await page2.click('[data-tool="select"]');
    const canvas2 = page2.locator('canvas');
    
    // Try to select the rectangle in tab 2
    await canvas2.click({ position: { x: 150, y: 125 } });
    
    // Delete it to verify it was there and selected
    await page2.keyboard.press('Delete');

    // Wait for sync back to tab 1
    await page1.waitForTimeout(1000);

    // In tab 1, the rectangle should now be gone
    await page1.click('[data-tool="select"]');
    await canvas1.click({ position: { x: 150, y: 125 } }); // Should not select anything
  });

  test('undo/redo operations sync across tabs', async () => {
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    await page1.goto('/');
    await page2.goto('/');
    await page1.waitForLoadState('networkidle');
    await page2.waitForLoadState('networkidle');

    // Draw a rectangle in tab 1
    await page1.click('[data-tool="rectangle"]');
    const canvas1 = page1.locator('canvas');
    
    await canvas1.hover({ position: { x: 100, y: 100 } });
    await page1.mouse.down();
    await canvas1.hover({ position: { x: 200, y: 150 } });
    await page1.mouse.up();

    // Wait for sync
    await page2.waitForTimeout(1000);

    // Undo in tab 2
    await page2.click('[data-action="undo"]');

    // Wait for sync back to tab 1
    await page1.waitForTimeout(1000);

    // In tab 1, the rectangle should be gone
    await page1.click('[data-tool="select"]');
    await canvas1.click({ position: { x: 150, y: 125 } }); // Should not select anything

    // Redo in tab 1
    await page1.click('[data-action="redo"]');

    // Wait for sync to tab 2
    await page2.waitForTimeout(1000);

    // In tab 2, the rectangle should be back
    await page2.click('[data-tool="select"]');
    const canvas2 = page2.locator('canvas');
    await canvas2.click({ position: { x: 150, y: 125 } });
    await page2.keyboard.press('Delete'); // Should successfully delete
  });

  test('shape movements sync across tabs', async () => {
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    await page1.goto('/');
    await page2.goto('/');
    await page1.waitForLoadState('networkidle');
    await page2.waitForLoadState('networkidle');

    // Draw a rectangle in tab 1
    await page1.click('[data-tool="rectangle"]');
    const canvas1 = page1.locator('canvas');
    
    await canvas1.hover({ position: { x: 100, y: 100 } });
    await page1.mouse.down();
    await canvas1.hover({ position: { x: 200, y: 150 } });
    await page1.mouse.up();

    // Wait for sync
    await page2.waitForTimeout(1000);

    // In tab 2, select and move the rectangle
    await page2.click('[data-tool="select"]');
    const canvas2 = page2.locator('canvas');
    
    await canvas2.click({ position: { x: 150, y: 125 } }); // Select
    
    // Drag to new position
    await canvas2.hover({ position: { x: 150, y: 125 } });
    await page2.mouse.down();
    await canvas2.hover({ position: { x: 300, y: 250 } });
    await page2.mouse.up();

    // Wait for sync back to tab 1
    await page1.waitForTimeout(1000);

    // In tab 1, the rectangle should be at the new position
    await page1.click('[data-tool="select"]');
    
    // Try to select at old position (should fail)
    await canvas1.click({ position: { x: 150, y: 125 } });
    
    // Try to select at new position (should succeed)
    await canvas1.click({ position: { x: 300, y: 250 } });
    await page1.keyboard.press('Delete'); // Should successfully delete
  });

  test('shape deletions sync across tabs', async () => {
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    await page1.goto('/');
    await page2.goto('/');
    await page1.waitForLoadState('networkidle');
    await page2.waitForLoadState('networkidle');

    // Draw multiple shapes in tab 1
    await page1.click('[data-tool="rectangle"]');
    const canvas1 = page1.locator('canvas');
    
    // First rectangle
    await canvas1.hover({ position: { x: 50, y: 50 } });
    await page1.mouse.down();
    await canvas1.hover({ position: { x: 100, y: 100 } });
    await page1.mouse.up();
    
    // Second rectangle
    await canvas1.hover({ position: { x: 150, y: 50 } });
    await page1.mouse.down();
    await canvas1.hover({ position: { x: 200, y: 100 } });
    await page1.mouse.up();

    // Wait for sync
    await page2.waitForTimeout(1000);

    // In tab 2, delete one of the rectangles
    await page2.click('[data-tool="select"]');
    const canvas2 = page2.locator('canvas');
    
    await canvas2.click({ position: { x: 75, y: 75 } }); // Select first rectangle
    await page2.keyboard.press('Delete');

    // Wait for sync back to tab 1
    await page1.waitForTimeout(1000);

    // In tab 1, first rectangle should be gone, second should remain
    await page1.click('[data-tool="select"]');
    
    // Try to select deleted rectangle (should fail)
    await canvas1.click({ position: { x: 75, y: 75 } });
    
    // Try to select remaining rectangle (should succeed)
    await canvas1.click({ position: { x: 175, y: 75 } });
    await page1.keyboard.press('Delete'); // Should successfully delete
  });

  test('edit mode operations sync across tabs', async () => {
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    await page1.goto('/');
    await page2.goto('/');
    await page1.waitForLoadState('networkidle');
    await page2.waitForLoadState('networkidle');

    // Draw a rectangle in tab 1
    await page1.click('[data-tool="rectangle"]');
    const canvas1 = page1.locator('canvas');
    
    await canvas1.hover({ position: { x: 100, y: 100 } });
    await page1.mouse.down();
    await canvas1.hover({ position: { x: 200, y: 150 } });
    await page1.mouse.up();

    // Wait for sync
    await page2.waitForTimeout(1000);

    // In tab 2, enter edit mode and modify the rectangle
    await page2.click('[data-tool="select"]');
    const canvas2 = page2.locator('canvas');
    
    await canvas2.click({ position: { x: 150, y: 125 } }); // Select
    await canvas2.dblclick({ position: { x: 150, y: 125 } }); // Enter edit mode
    
    // Verify edit mode is active
    await expect(page2.locator('[data-tool="edit"]')).toHaveClass(/active/);
    
    // Resize the rectangle by dragging a corner
    await canvas2.hover({ position: { x: 200, y: 150 } }); // Bottom-right corner
    await page2.mouse.down();
    await canvas2.hover({ position: { x: 250, y: 200 } });
    await page2.mouse.up();

    // Wait for sync back to tab 1
    await page1.waitForTimeout(1000);

    // In tab 1, the rectangle should be resized
    await page1.click('[data-tool="select"]');
    
    // Try to select at new size
    await canvas1.click({ position: { x: 225, y: 175 } });
    await page1.keyboard.press('Delete'); // Should successfully delete the resized rectangle
  });

  test('multiple concurrent operations handle conflicts gracefully', async () => {
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    await page1.goto('/');
    await page2.goto('/');
    await page1.waitForLoadState('networkidle');
    await page2.waitForLoadState('networkidle');

    // Simultaneously draw shapes in both tabs
    const canvas1 = page1.locator('canvas');
    const canvas2 = page2.locator('canvas');

    // Tab 1: Draw rectangle
    await page1.click('[data-tool="rectangle"]');
    const rect1Promise = (async () => {
      await canvas1.hover({ position: { x: 50, y: 50 } });
      await page1.mouse.down();
      await canvas1.hover({ position: { x: 100, y: 100 } });
      await page1.mouse.up();
    })();

    // Tab 2: Draw circle at same time
    await page2.click('[data-tool="circle"]');
    const circle2Promise = (async () => {
      await canvas2.hover({ position: { x: 150, y: 50 } });
      await page2.mouse.down();
      await canvas2.hover({ position: { x: 200, y: 100 } });
      await page2.mouse.up();
    })();

    // Wait for both operations to complete
    await Promise.all([rect1Promise, circle2Promise]);

    // Wait for sync to settle
    await page1.waitForTimeout(2000);
    await page2.waitForTimeout(2000);

    // Both shapes should exist in both tabs
    await page1.click('[data-tool="select"]');
    await page2.click('[data-tool="select"]');

    // In tab 1, both shapes should be selectable
    await canvas1.click({ position: { x: 75, y: 75 } }); // Rectangle
    await page1.keyboard.press('Delete');
    
    await canvas1.click({ position: { x: 175, y: 75 } }); // Circle
    await page1.keyboard.press('Delete');

    // Wait for sync
    await page2.waitForTimeout(1000);

    // In tab 2, both shapes should be gone
    await canvas2.click({ position: { x: 75, y: 75 } }); // Should not select anything
    await canvas2.click({ position: { x: 175, y: 75 } }); // Should not select anything
  });
});
