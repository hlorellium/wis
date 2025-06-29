import { test, expect } from '@playwright/test';
import { createShapes, waitForCanvasReady } from './utils';

// Helper function to wait for property inspector to be visible with content
async function waitForPropertyInspectorVisible(page: any, expectedTitle: string = '') {
  await expect(page.locator('#property-inspector')).toBeVisible({ timeout: 10000 });
  if (expectedTitle) {
    await expect(page.locator('.property-title')).toHaveText(expectedTitle, { timeout: 5000 });
  }
}

// Helper function to wait for property inspector to be hidden
async function waitForPropertyInspectorHidden(page: any) {
  await expect(page.locator('#property-inspector')).toBeHidden({ timeout: 10000 });
}

// Helper function to select a shape and wait for property inspector
async function selectShapeAndWaitForInspector(page: any, x: number, y: number, expectedTitle: string = '') {
  await page.click('#canvas', { position: { x, y } });
  await page.waitForTimeout(100); // Brief wait for selection to register
  await waitForPropertyInspectorVisible(page, expectedTitle);
}

test.describe('Property Inspector', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForCanvasReady(page);
    
    // Ensure property inspector is initially hidden
    await expect(page.locator('#property-inspector')).toBeHidden();
  });

  test('should show property inspector when shape is selected', async ({ page }) => {
    // Create a rectangle shape
    await createShapes(page, 'rectangle', [{ x: 100, y: 100 }]);
    
    // Switch to select tool
    await page.click('[data-tool="select"]');
    
    // Click on the rectangle to select it and wait for inspector
    await selectShapeAndWaitForInspector(page, 125, 125, 'Rectangle');
    
    // Should show shape ID
    await expect(page.locator('.property-id')).toContainText('ID:');
  });

  test('should hide property inspector when no shapes are selected', async ({ page }) => {
    // Create a rectangle shape
    await createShapes(page, 'rectangle', [{ x: 100, y: 100 }]);
    
    // Switch to select tool and select the shape
    await page.click('[data-tool="select"]');
    await selectShapeAndWaitForInspector(page, 125, 125, 'Rectangle');
    
    // Click on empty area to deselect
    await page.click('#canvas', { position: { x: 300, y: 300 } });
    
    // Property inspector should be hidden
    await waitForPropertyInspectorHidden(page);
  });

  test('should display and edit rectangle properties', async ({ page }) => {
    // Create a rectangle shape
    await createShapes(page, 'rectangle', [{ x: 100, y: 100 }]);
    
    // Switch to select tool and select the rectangle
    await page.click('[data-tool="select"]');
    await selectShapeAndWaitForInspector(page, 125, 125, 'Rectangle');
    
    // Verify position fields are shown with correct values
    const xInput = page.locator('[data-property="x"]');
    const yInput = page.locator('[data-property="y"]');
    await expect(xInput).toHaveValue('100');
    await expect(yInput).toHaveValue('100');
    
    // Verify size fields are shown
    const widthInput = page.locator('[data-property="width"]');
    const heightInput = page.locator('[data-property="height"]');
    await expect(widthInput).toBeVisible();
    await expect(heightInput).toBeVisible();
    
    // Edit the X position
    await xInput.clear();
    await xInput.fill('150');
    await page.waitForTimeout(400); // Wait for debounce
    
    // Rectangle should move to new position
    // We can verify this by checking if the new position can be selected
    await page.click('#canvas', { position: { x: 300, y: 300 } }); // Deselect
    await waitForPropertyInspectorHidden(page);
    await selectShapeAndWaitForInspector(page, 175, 125, 'Rectangle'); // New position
    await expect(xInput).toHaveValue('150');
  });

  test('should display and edit circle properties', async ({ page }) => {
    // Create a circle shape
    await createShapes(page, 'circle', [{ x: 200, y: 200 }]);
    
    // Switch to select tool and select the circle
    await page.click('[data-tool="select"]');
    await selectShapeAndWaitForInspector(page, 220, 220, 'Circle'); // Click offset from center
    
    // Verify position fields
    const xInput = page.locator('[data-property="x"]');
    const yInput = page.locator('[data-property="y"]');
    await expect(xInput).toHaveValue('200');
    await expect(yInput).toHaveValue('200');
    
    // Verify radius field
    const radiusInput = page.locator('[data-property="radius"]');
    await expect(radiusInput).toBeVisible();
    
    // Edit the radius
    await radiusInput.clear();
    await radiusInput.fill('30');
    await page.waitForTimeout(400); // Wait for debounce
    
    // Verify the change took effect by checking the input value
    await expect(radiusInput).toHaveValue('30');
  });

  test('should display and edit line properties', async ({ page }) => {
    // Create a line shape
    await createShapes(page, 'line', [
      { x: 50, y: 50 },
      { x: 150, y: 150 }
    ]);
    
    // Switch to select tool and select the line
    await page.click('[data-tool="select"]');
    await selectShapeAndWaitForInspector(page, 100, 100, 'Line'); // Click on line
    
    // Verify start point fields
    const x1Input = page.locator('[data-property="x1"]');
    const y1Input = page.locator('[data-property="y1"]');
    await expect(x1Input).toHaveValue('50');
    await expect(y1Input).toHaveValue('50');
    
    // Verify end point fields
    const x2Input = page.locator('[data-property="x2"]');
    const y2Input = page.locator('[data-property="y2"]');
    await expect(x2Input).toHaveValue('150');
    await expect(y2Input).toHaveValue('150');
    
    // Edit the end point
    await x2Input.clear();
    await x2Input.fill('200');
    await page.waitForTimeout(400); // Wait for debounce
    
    // Verify the change
    await expect(x2Input).toHaveValue('200');
  });

  test('should edit style properties', async ({ page }) => {
    // Create a rectangle shape
    await createShapes(page, 'rectangle', [{ x: 100, y: 100 }]);
    
    // Switch to select tool and select the rectangle
    await page.click('[data-tool="select"]');
    await selectShapeAndWaitForInspector(page, 125, 125, 'Rectangle');
    
    // Verify style section is visible
    await expect(page.locator('.property-label').filter({ hasText: 'Style' })).toBeVisible();
    
    // Test fill color change
    const fillColorInput = page.locator('[data-property="fillColor"]');
    await expect(fillColorInput).toBeVisible();
    await fillColorInput.fill('#ff0000'); // Red
    await page.waitForTimeout(400); // Wait for debounce
    
    // Test stroke color change
    const strokeColorInput = page.locator('[data-property="strokeColor"]');
    await expect(strokeColorInput).toBeVisible();
    await strokeColorInput.fill('#00ff00'); // Green
    await page.waitForTimeout(400); // Wait for debounce
    
    // Test fill mode change
    const fillModeSelect = page.locator('[data-property="fillMode"]');
    await expect(fillModeSelect).toBeVisible();
    await fillModeSelect.selectOption('both');
    await page.waitForTimeout(400); // Wait for debounce
    
    // Test stroke style change
    const strokeStyleSelect = page.locator('[data-property="strokeStyle"]');
    await expect(strokeStyleSelect).toBeVisible();
    await strokeStyleSelect.selectOption('dotted');
    await page.waitForTimeout(400); // Wait for debounce
    
    // Test stroke width change
    const strokeWidthSelect = page.locator('[data-property="strokeWidth"]');
    await expect(strokeWidthSelect).toBeVisible();
    await strokeWidthSelect.selectOption('5');
    await page.waitForTimeout(400); // Wait for debounce
    
    // Verify values are maintained
    await expect(fillColorInput).toHaveValue('#ff0000');
    await expect(strokeColorInput).toHaveValue('#00ff00');
    await expect(fillModeSelect).toHaveValue('both');
    await expect(strokeStyleSelect).toHaveValue('dotted');
    await expect(strokeWidthSelect).toHaveValue('5');
  });

  test('should show multiple selection with common properties', async ({ page }) => {
    // Create two rectangle shapes
    await createShapes(page, 'rectangle', [
      { x: 100, y: 100 },
      { x: 200, y: 100 }
    ]);
    
    // Switch to select tool
    await page.click('[data-tool="select"]');
    
    // Select first rectangle
    await selectShapeAndWaitForInspector(page, 125, 125, 'Rectangle');
    
    // Hold Ctrl and select second rectangle (multi-select)
    await page.keyboard.down('Control');
    await page.click('#canvas', { position: { x: 225, y: 125 } });
    await page.keyboard.up('Control');
    
    // Wait for multi-selection to register
    await page.waitForTimeout(200);
    
    // Property inspector should show multiple selection
    await expect(page.locator('.property-title')).toHaveText('Multiple Selection');
    await expect(page.locator('.property-id')).toContainText('2 shapes selected');
    
    // Style properties should be visible (common properties)
    await expect(page.locator('.property-label').filter({ hasText: 'Style' })).toBeVisible();
  });

  test('should support undo/redo for property changes', async ({ page }) => {
    // Create a rectangle shape
    await createShapes(page, 'rectangle', [{ x: 100, y: 100 }]);
    
    // Switch to select tool and select the rectangle
    await page.click('[data-tool="select"]');
    await selectShapeAndWaitForInspector(page, 125, 125, 'Rectangle');
    
    // Change the X position
    const xInput = page.locator('[data-property="x"]');
    const originalValue = await xInput.inputValue();
    await xInput.clear();
    await xInput.fill('200');
    await page.waitForTimeout(400); // Wait for debounce
    
    // Verify the change
    await expect(xInput).toHaveValue('200');
    
    // Undo the change
    await page.keyboard.press('Control+z');
    await page.waitForTimeout(100);
    
    // Should revert to original value
    await expect(xInput).toHaveValue(originalValue);
    
    // Redo the change
    await page.keyboard.press('Control+y');
    await page.waitForTimeout(100);
    
    // Should show the changed value again
    await expect(xInput).toHaveValue('200');
  });

  test('should persist property changes across tool switches', async ({ page }) => {
    // Create a rectangle shape
    await createShapes(page, 'rectangle', [{ x: 100, y: 100 }]);
    
    // Switch to select tool and select the rectangle
    await page.click('[data-tool="select"]');
    await selectShapeAndWaitForInspector(page, 125, 125, 'Rectangle');
    
    // Change the fill color
    const fillColorInput = page.locator('[data-property="fillColor"]');
    await fillColorInput.fill('#ff0000');
    await page.waitForTimeout(400); // Wait for debounce
    
    // Switch to pan tool
    await page.click('[data-tool="pan"]');
    
    // Property inspector should be hidden
    await waitForPropertyInspectorHidden(page);
    
    // Switch back to select tool and select the rectangle again
    await page.click('[data-tool="select"]');
    await selectShapeAndWaitForInspector(page, 125, 125, 'Rectangle');
    
    // The color change should be preserved
    await expect(fillColorInput).toHaveValue('#ff0000');
  });
});
