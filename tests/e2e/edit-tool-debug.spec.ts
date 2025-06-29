import { test, expect } from '@playwright/test';
import { 
  setupTest,
  clickToolAndExpectActive,
  clickCanvas,
  drawRectangle,
  getMainCanvas
} from './utils';

test.describe('Edit Tool Debug Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupTest(page);
  });

  test('debug: step by step edit operation', async ({ page }) => {
    // Create a rectangle
    await clickToolAndExpectActive(page, 'rectangle');
    await drawRectangle(page, 100, 100, 200, 150);

    // Switch to select tool and select the rectangle
    await clickToolAndExpectActive(page, 'select');
    await clickCanvas(page, 150, 125);

    // Check initial undo state
    const undoButtonBefore = page.locator('[data-action="undo"]');
    await expect(undoButtonBefore).toHaveAttribute('disabled');

    // Double-click to enter edit mode
    const canvas = getMainCanvas(page);
    await canvas.dblclick({ position: { x: 150, y: 125 } });

    // Wait a moment for edit mode to activate
    await page.waitForTimeout(200);

    // Try a simple drag operation from center to nearby position
    await page.mouse.move(150, 125); // Go to center of rectangle
    await page.mouse.down();
    await page.mouse.move(160, 135); // Small movement
    await page.mouse.up();

    // Wait for the operation to complete
    await page.waitForTimeout(500);

    // Check if undo is now enabled
    const undoButtonAfter = page.locator('[data-action="undo"]');
    console.log('Checking undo button state after drag operation...');
    
    try {
      await expect(undoButtonAfter).not.toHaveAttribute('disabled', { timeout: 2000 });
      console.log('SUCCESS: Undo button is now enabled');
    } catch (e) {
      console.log('FAILURE: Undo button is still disabled');
      
      // Let's try a different approach - drag a corner handle
      console.log('Trying to drag corner handle...');
      await page.mouse.move(200, 150); // Bottom-right corner
      await page.mouse.down();
      await page.mouse.move(220, 170); // Drag to resize
      await page.mouse.up();
      await page.waitForTimeout(500);
      
      try {
        await expect(undoButtonAfter).not.toHaveAttribute('disabled', { timeout: 2000 });
        console.log('SUCCESS: Undo button enabled after corner drag');
      } catch (e2) {
        console.log('FAILURE: Still no undo after corner drag');
        throw e2;
      }
    }
  });

  test('debug: check if rectangle tool creates undo entries', async ({ page }) => {
    // Check that basic drawing operations create undo entries
    await clickToolAndExpectActive(page, 'rectangle');
    
    const undoButtonBefore = page.locator('[data-action="undo"]');
    await expect(undoButtonBefore).toHaveAttribute('disabled');
    
    await drawRectangle(page, 100, 100, 200, 150);
    await page.waitForTimeout(200);
    
    const undoButtonAfter = page.locator('[data-action="undo"]');
    await expect(undoButtonAfter).not.toHaveAttribute('disabled');
    
    console.log('SUCCESS: Basic rectangle drawing creates undo entries');
  });

  test('debug: check edit mode tool state', async ({ page }) => {
    // Create and select a rectangle
    await clickToolAndExpectActive(page, 'rectangle');
    await drawRectangle(page, 100, 100, 200, 150);
    await clickToolAndExpectActive(page, 'select');
    await clickCanvas(page, 150, 125);

    // Double-click to enter edit mode
    const canvas = getMainCanvas(page);
    await canvas.dblclick({ position: { x: 150, y: 125 } });
    await page.waitForTimeout(200);

    // Check what tool is active after entering edit mode
    const selectButton = page.locator('[data-tool="select"]');
    const isSelectActive = await selectButton.getAttribute('aria-pressed');
    console.log('Select tool aria-pressed:', isSelectActive);

    // Log current page state for debugging
    const pageTitle = await page.title();
    console.log('Page title:', pageTitle);
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'debug-edit-mode.png' });
  });
});
