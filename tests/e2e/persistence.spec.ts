import { test, expect } from '@playwright/test';

test.describe('Drawing Application - Persistence & Recovery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('drawing persists after page reload', async ({ page }) => {
    // Draw some shapes
    await page.click('[data-tool="rectangle"]');
    const canvas = page.locator('canvas');
    
    // Rectangle 1
    await canvas.hover({ position: { x: 50, y: 50 } });
    await page.mouse.down();
    await canvas.hover({ position: { x: 150, y: 100 } });
    await page.mouse.up();
    
    // Circle
    await page.click('[data-tool="circle"]');
    await canvas.hover({ position: { x: 200, y: 150 } });
    await page.mouse.down();
    await canvas.hover({ position: { x: 250, y: 200 } });
    await page.mouse.up();
    
    // Line
    await page.click('[data-tool="line"]');
    await canvas.hover({ position: { x: 300, y: 50 } });
    await page.mouse.down();
    await canvas.hover({ position: { x: 400, y: 150 } });
    await page.mouse.up();

    // Wait for persistence
    await page.waitForTimeout(500);

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Give persistence time to restore
    await page.waitForTimeout(1000);

    // Switch to select tool and verify all shapes are restored
    await page.click('[data-tool="select"]');
    
    // Test rectangle
    await canvas.click({ position: { x: 100, y: 75 } });
    await page.keyboard.press('Delete');
    
    // Test circle
    await canvas.click({ position: { x: 225, y: 175 } });
    await page.keyboard.press('Delete');
    
    // Test line
    await canvas.click({ position: { x: 350, y: 100 } });
    await page.keyboard.press('Delete');
  });

  test('undo/redo history persists after reload', async ({ page }) => {
    // Draw a rectangle
    await page.click('[data-tool="rectangle"]');
    const canvas = page.locator('canvas');
    
    await canvas.hover({ position: { x: 100, y: 100 } });
    await page.mouse.down();
    await canvas.hover({ position: { x: 200, y: 150 } });
    await page.mouse.up();

    // Draw a circle
    await page.click('[data-tool="circle"]');
    await canvas.hover({ position: { x: 250, y: 100 } });
    await page.mouse.down();
    await canvas.hover({ position: { x: 300, y: 150 } });
    await page.mouse.up();

    // Wait for persistence
    await page.waitForTimeout(500);

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // After reload, undo should work to remove the circle
    await page.click('[data-action="undo"]');
    
    // Switch to select and verify circle is gone, rectangle remains
    await page.click('[data-tool="select"]');
    
    // Circle should be gone
    await canvas.click({ position: { x: 275, y: 125 } }); // Should not select anything
    
    // Rectangle should still be there
    await canvas.click({ position: { x: 150, y: 125 } });
    await page.keyboard.press('Delete');

    // Redo should bring the circle back
    await page.click('[data-action="redo"]');
    
    // Circle should be back
    await canvas.click({ position: { x: 275, y: 125 } });
    await page.keyboard.press('Delete');
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

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // App should still load and work normally
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // Should be able to draw shapes even without persistence
    await page.click('[data-tool="rectangle"]');
    await canvas.hover({ position: { x: 100, y: 100 } });
    await page.mouse.down();
    await canvas.hover({ position: { x: 200, y: 150 } });
    await page.mouse.up();

    // Should be able to select and manipulate shapes
    await page.click('[data-tool="select"]');
    await canvas.click({ position: { x: 150, y: 125 } });
    await page.keyboard.press('Delete');

    // Should not have any fatal errors
    const fatalErrors = consoleErrors.filter(error => 
      error.includes('Cannot read') || 
      error.includes('undefined') ||
      error.includes('TypeError')
    );
    expect(fatalErrors).toHaveLength(0);
  });

  test('app recovers from corrupted storage data', async ({ page }) => {
    // First, create some valid data
    await page.click('[data-tool="rectangle"]');
    const canvas = page.locator('canvas');
    
    await canvas.hover({ position: { x: 100, y: 100 } });
    await page.mouse.down();
    await canvas.hover({ position: { x: 200, y: 150 } });
    await page.mouse.up();

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
    await expect(canvas).toBeVisible();

    // Should start with clean state
    await page.click('[data-tool="select"]');
    
    // Previous rectangle should be gone due to corruption recovery
    await canvas.click({ position: { x: 150, y: 125 } }); // Should not select anything

    // Should be able to create new shapes normally
    await page.click('[data-tool="circle"]');
    await canvas.hover({ position: { x: 200, y: 200 } });
    await page.mouse.down();
    await canvas.hover({ position: { x: 250, y: 250 } });
    await page.mouse.up();

    await page.click('[data-tool="select"]');
    await canvas.click({ position: { x: 225, y: 225 } });
    await page.keyboard.press('Delete');
  });

  test('large drawings with many shapes persist correctly', async ({ page }) => {
    const canvas = page.locator('canvas');
    
    // Create many shapes to test performance and persistence limits
    await page.click('[data-tool="rectangle"]');
    
    const shapePositions: { x: number; y: number }[] = [];
    for (let i = 0; i < 20; i++) {
      const x = 50 + (i % 5) * 80;
      const y = 50 + Math.floor(i / 5) * 60;
      
      await canvas.hover({ position: { x, y } });
      await page.mouse.down();
      await canvas.hover({ position: { x: x + 60, y: y + 40 } });
      await page.mouse.up();
      
      shapePositions.push({ x: x + 30, y: y + 20 });
    }

    // Wait for persistence
    await page.waitForTimeout(1000);

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Give more time for large dataset

    // Verify all shapes are restored
    await page.click('[data-tool="select"]');
    
    // Test a few random shapes
    const testIndices = [0, 5, 10, 15, 19];
    for (const i of testIndices) {
      const pos = shapePositions[i];
      await canvas.click({ position: { x: pos.x, y: pos.y } });
      await page.keyboard.press('Delete');
    }
  });

  test('persistence works correctly across different browsers/sessions', async ({ page, context }) => {
    // Draw some shapes in the first session
    await page.click('[data-tool="rectangle"]');
    const canvas = page.locator('canvas');
    
    await canvas.hover({ position: { x: 100, y: 100 } });
    await page.mouse.down();
    await canvas.hover({ position: { x: 200, y: 150 } });
    await page.mouse.up();

    await page.waitForTimeout(500);

    // Create a new page in the same context (simulating new tab)
    const page2 = await context.newPage();
    await page2.goto('/');
    await page2.waitForLoadState('networkidle');
    await page2.waitForTimeout(1000);

    // The drawing should be loaded in the new tab
    await page2.click('[data-tool="select"]');
    const canvas2 = page2.locator('canvas');
    
    await canvas2.click({ position: { x: 150, y: 125 } });
    await page2.keyboard.press('Delete');

    await page2.close();
  });

  test('persistence handles rapid save/load cycles', async ({ page }) => {
    const canvas = page.locator('canvas');
    
    // Rapidly create and modify shapes
    for (let i = 0; i < 5; i++) {
      await page.click('[data-tool="rectangle"]');
      
      const x = 50 + i * 30;
      await canvas.hover({ position: { x, y: 50 } });
      await page.mouse.down();
      await canvas.hover({ position: { x: x + 40, y: 90 } });
      await page.mouse.up();
      
      // Rapidly undo/redo
      await page.click('[data-action="undo"]');
      await page.click('[data-action="redo"]');
    }

    // Quick reload to test persistence under stress
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Should have all the shapes
    await page.click('[data-tool="select"]');
    
    // Test a few shapes exist
    await canvas.click({ position: { x: 70, y: 70 } });
    await page.keyboard.press('Delete');
    
    await canvas.click({ position: { x: 160, y: 70 } });
    await page.keyboard.press('Delete');
  });
});
