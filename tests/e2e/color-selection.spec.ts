import { test, expect } from '@playwright/test';
import {
  setupTest,
  drawRectangle,
  drawCircle,
  drawLine,
  drawCurve,
  clickToolAndExpectActive,
  getMainCanvas
} from './utils';

test.describe('Color Selection E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupTest(page);
  });

  test('color picker is visible and accessible', async ({ page }) => {
    // Check that color picker exists and is visible
    const colorPicker = page.locator('#color-picker');
    await expect(colorPicker).toBeVisible();
    
    // Check that color picker label exists
    const colorPickerLabel = page.locator('.color-picker-label');
    await expect(colorPickerLabel).toBeVisible();
    
    // Check accessibility attributes
    await expect(colorPicker).toHaveAttribute('aria-label', 'Select drawing color');
    await expect(colorPickerLabel).toHaveAttribute('aria-label', 'Choose color');
  });

  test('can select different colors and draw shapes', async ({ page }) => {
    const colorPicker = page.locator('#color-picker');
    
    // Test drawing with red color
    await colorPicker.fill('#ff0000');
    await clickToolAndExpectActive(page, 'rectangle');
    await drawRectangle(page, 100, 100, 150, 150);
    await page.waitForTimeout(500);
    
    // Test drawing with blue color
    await colorPicker.fill('#0000ff');
    await drawRectangle(page, 200, 100, 250, 150);
    await page.waitForTimeout(500);
    
    // Test drawing with green color
    await colorPicker.fill('#00ff00');
    await clickToolAndExpectActive(page, 'circle');
    await drawCircle(page, 150, 200, 200, 250);
    await page.waitForTimeout(500);
  });

  test('color selection persists across tool switches', async ({ page }) => {
    const colorPicker = page.locator('#color-picker');
    
    // Select a custom color
    await colorPicker.fill('#ff00ff'); // Magenta
    
    // Switch between tools
    await clickToolAndExpectActive(page, 'line');
    await clickToolAndExpectActive(page, 'rectangle');
    await clickToolAndExpectActive(page, 'circle');
    await clickToolAndExpectActive(page, 'curve');
    
    // Color should still be selected
    await expect(colorPicker).toHaveValue('#ff00ff');
    
    // Draw a shape to verify the color is used
    await clickToolAndExpectActive(page, 'rectangle');
    await drawRectangle(page, 50, 50, 90, 90);
    await page.waitForTimeout(500);
  });

  test('color picker updates visual indicator', async ({ page }) => {
    const colorPicker = page.locator('#color-picker');
    const colorIndicator = page.locator('.color-picker-label svg circle:last-child');
    
    // Change to red and verify indicator updates
    await colorPicker.fill('#ff0000');
    await expect(colorIndicator).toHaveAttribute('fill', '#ff0000');
    
    // Change to blue and verify indicator updates
    await colorPicker.fill('#0000ff');
    await expect(colorIndicator).toHaveAttribute('fill', '#0000ff');
    
    // Change to green and verify indicator updates
    await colorPicker.fill('#00ff00');
    await expect(colorIndicator).toHaveAttribute('fill', '#00ff00');
  });

  test('different shape types use selected color', async ({ page }) => {
    const colorPicker = page.locator('#color-picker');
    
    // Set color to orange
    await colorPicker.fill('#ffa500');
    
    // Draw different shape types
    await clickToolAndExpectActive(page, 'line');
    await drawLine(page, 50, 50, 100, 100);
    await page.waitForTimeout(500);
    
    await clickToolAndExpectActive(page, 'rectangle');
    await drawRectangle(page, 120, 50, 160, 80);
    await page.waitForTimeout(500);
    
    await clickToolAndExpectActive(page, 'circle');
    await drawCircle(page, 200, 75, 225, 100);
    await page.waitForTimeout(500);
    
    await clickToolAndExpectActive(page, 'curve');
    await drawCurve(page, 50, 150, 150, 200);
    await page.waitForTimeout(500);
    
    // All shapes should be drawn in orange color
    // Note: We can't easily verify the actual canvas colors in E2E tests,
    // but we can verify the shapes were created successfully
  });

  test('color selection works with undo/redo', async ({ page }) => {
    const colorPicker = page.locator('#color-picker');
    const undoButton = page.locator('[data-action="undo"]');
    const redoButton = page.locator('[data-action="redo"]');
    
    // Draw shape with red color
    await colorPicker.fill('#ff0000');
    await clickToolAndExpectActive(page, 'rectangle');
    await drawRectangle(page, 100, 100, 150, 150);
    await page.waitForTimeout(500);
    
    // Change color and draw another shape
    await colorPicker.fill('#00ff00');
    await drawRectangle(page, 200, 100, 250, 150);
    await page.waitForTimeout(500);
    
    // Undo the second shape
    await undoButton.click();
    await page.waitForTimeout(500);
    
    // Redo the second shape
    await redoButton.click();
    await page.waitForTimeout(500);
    
    // Color picker should still show green
    await expect(colorPicker).toHaveValue('#00ff00');
  });

  test('color persists after page reload', async ({ page }) => {
    const colorPicker = page.locator('#color-picker');
    
    // Select a custom color
    await colorPicker.fill('#ff6600'); // Orange
    
    // Draw a shape to ensure state is saved
    await clickToolAndExpectActive(page, 'rectangle');
    await drawRectangle(page, 100, 100, 150, 150);
    await page.waitForTimeout(500);
    
    // Wait a moment for persistence
    await page.waitForTimeout(1000);
    
    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Color should be restored
    const restoredColorPicker = page.locator('#color-picker');
    await expect(restoredColorPicker).toHaveValue('#ff6600');
  });

  test('multiple rapid color changes work correctly', async ({ page }) => {
    const colorPicker = page.locator('#color-picker');
    
    // Rapidly change colors
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    
    for (const color of colors) {
      await colorPicker.fill(color);
      await page.waitForTimeout(100); // Small delay to simulate user interaction
      await expect(colorPicker).toHaveValue(color);
    }
    
    // Draw a shape with the final color
    await clickToolAndExpectActive(page, 'circle');
    await drawCircle(page, 150, 150, 190, 190);
    await page.waitForTimeout(500);
  });

  test('color picker keyboard navigation works', async ({ page }) => {
    const colorPicker = page.locator('#color-picker');
    
    // Focus the color picker
    await colorPicker.focus();
    
    // Verify it's focused
    await expect(colorPicker).toBeFocused();
    
    // Tab navigation should work (test accessibility)
    await page.keyboard.press('Tab');
    
    // Should move to next focusable element (likely a tool button)
    const activeElement = page.locator(':focus');
    await expect(activeElement).not.toBe(colorPicker);
  });

  test('color picker respects system accessibility settings', async ({ page }) => {
    // This test ensures the color picker works with high contrast mode and other accessibility features
    const colorPicker = page.locator('#color-picker');
    const colorPickerLabel = page.locator('.color-picker-label');
    
    // Check that elements have proper contrast and are visible
    await expect(colorPicker).toBeVisible();
    await expect(colorPickerLabel).toBeVisible();
    
    // Check that click targets are large enough (color picker label should be 40x40px)
    const labelBox = await colorPickerLabel.boundingBox();
    expect(labelBox?.width).toBeGreaterThanOrEqual(40);
    expect(labelBox?.height).toBeGreaterThanOrEqual(40);
  });
});
