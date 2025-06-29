import { test, expect } from '@playwright/test';

test.describe('Drawing Application - Basic Setup', () => {
  test('app loads and displays basic UI elements', async ({ page }) => {
    await page.goto('/');

    // Wait for the app to load
    await page.waitForLoadState('networkidle');

    // Check that the main canvas is present and visible
    const canvas = page.locator('#canvas');
    await expect(canvas).toBeVisible();

    // Check that tool buttons are present
    await expect(page.locator('[data-tool="select"]')).toBeVisible();
    await expect(page.locator('[data-tool="edit"]')).toBeVisible();
    await expect(page.locator('[data-tool="rectangle"]')).toBeVisible();
    await expect(page.locator('[data-tool="circle"]')).toBeVisible();
    await expect(page.locator('[data-tool="line"]')).toBeVisible();
    await expect(page.locator('[data-tool="bezier"]')).toBeVisible();

    // Check that undo/redo buttons are present
    await expect(page.locator('[data-action="undo"]')).toBeVisible();
    await expect(page.locator('[data-action="redo"]')).toBeVisible();

    // Verify the page title
    await expect(page).toHaveTitle(/Drawing App/);
  });

  test('canvas has correct dimensions', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const canvas = page.locator('#canvas');
    
    // Check canvas dimensions
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).toBeTruthy();
    expect(canvasBox!.width).toBeGreaterThan(0);
    expect(canvasBox!.height).toBeGreaterThan(0);
  });

  test('default tool is selected', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check that select tool is active by default (should have aria-pressed="true")
    const selectTool = page.locator('[data-tool="select"]');
    await expect(selectTool).toHaveAttribute('aria-pressed', 'true');
  });

  test('can switch between tools', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Start with select tool active
    await expect(page.locator('[data-tool="select"]')).toHaveAttribute('aria-pressed', 'true');

    // Click rectangle tool
    await page.click('[data-tool="rectangle"]');
    await expect(page.locator('[data-tool="rectangle"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-tool="select"]')).toHaveAttribute('aria-pressed', 'false');

    // Click circle tool
    await page.click('[data-tool="circle"]');
    await expect(page.locator('[data-tool="circle"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-tool="rectangle"]')).toHaveAttribute('aria-pressed', 'false');

    // Switch back to select tool
    await page.click('[data-tool="select"]');
    await expect(page.locator('[data-tool="select"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-tool="circle"]')).toHaveAttribute('aria-pressed', 'false');
  });

  test('console has no errors on load', async ({ page }) => {
    const consoleErrors: string[] = [];
    
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Allow a moment for any async errors
    await page.waitForTimeout(1000);

    // Should have no console errors
    expect(consoleErrors).toHaveLength(0);
  });
});
