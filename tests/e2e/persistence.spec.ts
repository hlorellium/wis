import { test, expect } from '@playwright/test';
import { 
  getMainCanvas, 
  expectToolActive, 
  clickToolAndExpectActive, 
  setupTest,
  drawRectangle,
  drawCircle,
  clickCanvas,
  selectAndDeleteShape,
  clickUndoWhenEnabled,
  clickRedoWhenEnabled
} from './utils';

test.describe('Drawing Application - Persistence & Recovery', () => {
  test.beforeEach(async ({ page }) => {
    await setupTest(page);
  });

  test('drawing persists after page reload', async ({ page }) => {
    // Draw some shapes
    await clickToolAndExpectActive(page, 'rectangle');
    await drawRectangle(page, 50, 50, 150, 100);
    
    // Circle
    await clickToolAndExpectActive(page, 'circle');
    await drawCircle(page, 200, 150, 250, 200);
    
    // Line
    await clickToolAndExpectActive(page, 'line');
    const canvas = getMainCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('Canvas not found');
    
    await page.mouse.move(canvasBox.x + 300, canvasBox.y + 50);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + 400, canvasBox.y + 150);
    await page.mouse.up();

    // Wait for persistence
    await page.waitForTimeout(500);

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Give persistence time to restore
    await page.waitForTimeout(1000);

    // Switch to select tool and verify all shapes are restored
    await clickToolAndExpectActive(page, 'select');
    
    // Test rectangle
    await selectAndDeleteShape(page, 100, 75);
    
    // Test circle
    await selectAndDeleteShape(page, 225, 175);
    
    // Test line
    await selectAndDeleteShape(page, 350, 100);
  });

  test('undo/redo history persists after reload', async ({ page }) => {
    // Draw a rectangle
    await clickToolAndExpectActive(page, 'rectangle');
    await drawRectangle(page, 100, 100, 200, 150);

    // Draw a circle
    await clickToolAndExpectActive(page, 'circle');
    await drawCircle(page, 250, 100, 300, 150);

    // Wait for persistence
    await page.waitForTimeout(500);

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // After reload, undo should work to remove the circle
    await clickUndoWhenEnabled(page);
    
    // Switch to select and verify circle is gone, rectangle remains
    await clickToolAndExpectActive(page, 'select');
    
    // Circle should be gone
    await clickCanvas(page, 275, 125); // Should not select anything
    
    // Rectangle should still be there
    await selectAndDeleteShape(page, 150, 125);

    // Redo should bring the circle back
    await clickRedoWhenEnabled(page);
    
    // Circle should be back
    await selectAndDeleteShape(page, 275, 125);
  });

  test('app handles IndexedDB not being available gracefully', async ({ page }) => {
    // Mock IndexedDB to throw errors
    await page.addInitScript(() => {
      // Override indexedDB to simulate it being unavailable
      Object.defineProperty(window, 'indexedDB', {
        value: null,
        writable: false
      });
    });

    // Check for console errors that might indicate storage issues
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await setupTest(page);

    // App should still load and work normally
    const canvas = getMainCanvas(page);
    await expect(canvas).toBeVisible();

    // Should be able to draw shapes even without persistence
    await clickToolAndExpectActive(page, 'rectangle');
    await drawRectangle(page, 100, 100, 200, 150);

    // Should be able to select and manipulate shapes
    await clickToolAndExpectActive(page, 'select');
    await selectAndDeleteShape(page, 150, 125);

    // Should not have fatal application errors (IndexedDB errors are expected)
    const fatalErrors = consoleErrors.filter(error => 
      error.includes('Cannot read') && !error.includes('IndexedDB') ||
      error.includes('undefined') && !error.includes('IndexedDB') ||
      error.includes('TypeError') && !error.includes('IndexedDB')
    );
    expect(fatalErrors).toHaveLength(0);
  });

  test('app recovers from corrupted storage data', async ({ page }) => {
    // First, create some valid data
    await clickToolAndExpectActive(page, 'rectangle');
    await drawRectangle(page, 100, 100, 200, 150);

    await page.waitForTimeout(500);

    // Corrupt the storage data
    await page.evaluate(() => {
      localStorage.clear();
      // Add some invalid JSON to simulate corruption
      localStorage.setItem('wis-drawing-data', 'invalid-json{');
    });

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // App should still load despite corrupted data
    const canvas = getMainCanvas(page);
    await expect(canvas).toBeVisible();

    // Should start with clean state
    await clickToolAndExpectActive(page, 'select');
    
    // Previous rectangle should be gone due to corruption recovery
    await clickCanvas(page, 150, 125); // Should not select anything

    // Should be able to create new shapes normally
    await clickToolAndExpectActive(page, 'circle');
    await drawCircle(page, 200, 200, 250, 250);

    await clickToolAndExpectActive(page, 'select');
    await selectAndDeleteShape(page, 225, 225);
  });

  test('large drawings with many shapes persist correctly', async ({ page }) => {
    // Create many shapes to test performance and persistence limits
    await clickToolAndExpectActive(page, 'rectangle');
    
    const shapePositions: { x: number; y: number }[] = [];
    for (let i = 0; i < 20; i++) {
      const x = 50 + (i % 5) * 80;
      const y = 50 + Math.floor(i / 5) * 60;
      
      await drawRectangle(page, x, y, x + 60, y + 40);
      shapePositions.push({ x: x + 30, y: y + 20 });
    }

    // Wait for persistence
    await page.waitForTimeout(1000);

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Give more time for large dataset

    // Verify all shapes are restored
    await clickToolAndExpectActive(page, 'select');
    
    // Test a few random shapes
    const testIndices = [0, 5, 10, 15, 19];
    for (const i of testIndices) {
      const pos = shapePositions[i];
      await selectAndDeleteShape(page, pos.x, pos.y);
    }
  });

  test('persistence works correctly across different browsers/sessions', async ({ page, context }) => {
    // Draw some shapes in the first session
    await clickToolAndExpectActive(page, 'rectangle');
    await drawRectangle(page, 100, 100, 200, 150);

    await page.waitForTimeout(500);

    // Create a new page in the same context (simulating new tab)
    const page2 = await context.newPage();
    await setupTest(page2);
    await page2.waitForTimeout(1000);

    // The drawing should be loaded in the new tab
    await clickToolAndExpectActive(page2, 'select');
    await selectAndDeleteShape(page2, 150, 125);

    await page2.close();
  });

  test('persistence handles rapid save/load cycles', async ({ page }) => {
    // Rapidly create and modify shapes
    for (let i = 0; i < 5; i++) {
      await clickToolAndExpectActive(page, 'rectangle');
      
      const x = 50 + i * 30;
      await drawRectangle(page, x, 50, x + 40, 90);
      
      // Rapidly undo/redo
      await clickUndoWhenEnabled(page);
      await clickRedoWhenEnabled(page);
    }

    // Quick reload to test persistence under stress
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Should have all the shapes
    await clickToolAndExpectActive(page, 'select');
    
    // Test a few shapes exist
    await selectAndDeleteShape(page, 70, 70);
    await selectAndDeleteShape(page, 160, 70);
  });
});
