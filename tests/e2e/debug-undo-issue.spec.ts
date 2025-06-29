import { test, expect } from '@playwright/test';
import { 
  setupTest,
  clickToolAndExpectActive,
  createAndEditRectangle,
  getMainCanvas,
  dragOnCanvas
} from './utils';

test.describe('Debug Undo Issue', () => {
  test('should show debug logs for edit operation', async ({ page }) => {
    await setupTest(page);

    // Listen to console logs
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log' || msg.type() === 'info') {
        logs.push(`[${msg.type()}] ${msg.text()}`);
      }
    });

    // Create and edit a rectangle
    await clickToolAndExpectActive(page, 'rectangle');
    const canvas = getMainCanvas(page);
    
    // Draw rectangle
    await canvas.click({ position: { x: 100, y: 100 } });
    await canvas.click({ position: { x: 200, y: 150 } });

    // Switch to edit mode
    await clickToolAndExpectActive(page, 'edit');
    
    // Select the rectangle
    await canvas.click({ position: { x: 150, y: 125 } });
    
    // Try to resize it by dragging a corner
    await dragOnCanvas(page, 200, 150, 220, 170);
    
    // Wait a moment for logs
    await page.waitForTimeout(1000);

    // Log all the console output
    console.log('=== Browser Console Logs ===');
    logs.forEach(log => console.log(log));
    console.log('=== End Console Logs ===');

    // Check undo button state
    const undoButton = page.locator('[data-action="undo"]');
    const isDisabled = await undoButton.getAttribute('disabled');
    console.log(`Undo button disabled attribute: ${isDisabled}`);
  });
});
