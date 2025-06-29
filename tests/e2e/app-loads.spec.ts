import { test, expect } from '@playwright/test';
import { 
  getMainCanvas, 
  expectToolActive, 
  expectToolInactive, 
  clickToolAndExpectActive, 
  setupTest 
} from './utils';

test.describe('Drawing Application - Basic Setup', () => {
  test('app loads and displays basic UI elements', async ({ page }) => {
    await setupTest(page);

    // Check that the main canvas is present and visible
    const canvas = getMainCanvas(page);
    await expect(canvas).toBeVisible();

    // Check that tool buttons are present
    await expect(page.locator('[data-tool="pan"]')).toBeVisible();
    await expect(page.locator('[data-tool="select"]')).toBeVisible();
    await expect(page.locator('[data-tool="rectangle"]')).toBeVisible();
    await expect(page.locator('[data-tool="circle"]')).toBeVisible();
    await expect(page.locator('[data-tool="line"]')).toBeVisible();
    await expect(page.locator('[data-tool="curve"]')).toBeVisible();

    // Check that undo/redo buttons are present
    await expect(page.locator('[data-action="undo"]')).toBeVisible();
    await expect(page.locator('[data-action="redo"]')).toBeVisible();

    // Verify the page title
    await expect(page).toHaveTitle(/Vite \+ TS/);
  });

  test('canvas has correct dimensions', async ({ page }) => {
    await setupTest(page);

    const canvas = getMainCanvas(page);
    
    // Check canvas dimensions
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).toBeTruthy();
    expect(canvasBox!.width).toBeGreaterThan(0);
    expect(canvasBox!.height).toBeGreaterThan(0);
  });

  test('default tool is selected', async ({ page }) => {
    await setupTest(page);

    // Check that pan tool is active by default
    await expectToolActive(page, 'pan');
  });

  test('can switch between tools', async ({ page }) => {
    await setupTest(page);

    // Start with pan tool active
    await expectToolActive(page, 'pan');

    // Click rectangle tool
    await clickToolAndExpectActive(page, 'rectangle');
    await expectToolInactive(page, 'pan');

    // Click circle tool
    await clickToolAndExpectActive(page, 'circle');
    await expectToolInactive(page, 'rectangle');

    // Switch to select tool
    await clickToolAndExpectActive(page, 'select');
    await expectToolInactive(page, 'circle');
  });

  test('console has no errors on load', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await setupTest(page);

    // Allow a moment for any async errors
    await page.waitForTimeout(1000);

    // Should have no console errors
    expect(consoleErrors).toHaveLength(0);
  });
});
