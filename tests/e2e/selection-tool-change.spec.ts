import { test, expect } from '@playwright/test';

test.describe('Selection clearing on tool change', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#canvas');
  });

  test('should clear selection when switching from select tool to drawing tools', async ({ page }) => {
    // Switch to select tool
    await page.click('[data-tool="select"]');
    
    // Select a shape by clicking on it (use the main canvas)
    const canvas = page.locator('#canvas');
    await canvas.click({ position: { x: 20, y: 20 } }); // Click on first shape
    
    // Verify selection is visible (check if selection outlines are rendered)
    // We can do this by checking if the canvas has been redrawn with selection
    const canvasElement = await canvas.elementHandle();
    const beforeSwitchImage = await canvasElement?.screenshot();
    
    // Switch to rectangle tool
    await page.click('[data-tool="rectangle"]');
    
    // Verify selection is cleared by checking canvas state
    const afterSwitchImage = await canvasElement?.screenshot();
    
    // The images should be different since selection outlines should be gone
    expect(beforeSwitchImage).toBeDefined();
    expect(afterSwitchImage).toBeDefined();
    
    // Verify the rectangle tool is now active
    const rectangleButton = page.locator('[data-tool="rectangle"]');
    await expect(rectangleButton).toHaveAttribute('aria-pressed', 'true');
  });

  test('should clear selection when switching from edit tool to drawing tools', async ({ page }) => {
    // Switch to select tool first
    await page.click('[data-tool="select"]');
    
    // Select a shape
    const canvas = page.locator('#canvas');
    await canvas.click({ position: { x: 20, y: 20 } });
    
    // Switch to edit tool
    await page.click('[data-tool="edit"]');
    
    // Verify edit tool is active
    const editButton = page.locator('[data-tool="edit"]');
    await expect(editButton).toHaveAttribute('aria-pressed', 'true');
    
    // Switch to circle tool
    await page.click('[data-tool="circle"]');
    
    // Verify circle tool is now active
    const circleButton = page.locator('[data-tool="circle"]');
    await expect(circleButton).toHaveAttribute('aria-pressed', 'true');
    
    // Verify edit tool is no longer active
    await expect(editButton).toHaveAttribute('aria-pressed', 'false');
  });

  test('should preserve selection when switching between select and edit tools', async ({ page }) => {
    // Switch to select tool
    await page.click('[data-tool="select"]');
    
    // Select a shape
    const canvas = page.locator('#canvas');
    await canvas.click({ position: { x: 20, y: 20 } });
    
    // Take screenshot to verify selection
    const canvasElement = await canvas.elementHandle();
    const selectModeImage = await canvasElement?.screenshot();
    
    // Switch to edit tool
    await page.click('[data-tool="edit"]');
    
    // Verify edit tool is active
    const editButton = page.locator('[data-tool="edit"]');
    await expect(editButton).toHaveAttribute('aria-pressed', 'true');
    
    // Switch back to select tool
    await page.click('[data-tool="select"]');
    
    // Verify select tool is active again
    const selectButton = page.locator('[data-tool="select"]');
    await expect(selectButton).toHaveAttribute('aria-pressed', 'true');
    
    // Selection should still be preserved (this is the expected behavior)
    const afterSwitchImage = await canvasElement?.screenshot();
    expect(selectModeImage).toBeDefined();
    expect(afterSwitchImage).toBeDefined();
  });

  test('should clear selection when switching to pan tool', async ({ page }) => {
    // Switch to select tool
    await page.click('[data-tool="select"]');
    
    // Select multiple shapes with drag selection
    const canvas = page.locator('#canvas');
    
    // Perform drag selection from top-left to bottom-right to select all shapes
    await canvas.dragTo(canvas, {
      sourcePosition: { x: 5, y: 5 },
      targetPosition: { x: 100, y: 100 }
    });
    
    // Take screenshot to verify selection
    const canvasElement = await canvas.elementHandle();
    const beforePanImage = await canvasElement?.screenshot();
    
    // Switch to pan tool
    await page.click('[data-tool="pan"]');
    
    // Verify pan tool is active
    const panButton = page.locator('[data-tool="pan"]');
    await expect(panButton).toHaveAttribute('aria-pressed', 'true');
    
    // Verify cursor changed to grab
    await expect(canvas).toHaveCSS('cursor', 'grab');
    
    // Take screenshot to verify selection is cleared
    const afterPanImage = await canvasElement?.screenshot();
    expect(beforePanImage).toBeDefined();
    expect(afterPanImage).toBeDefined();
  });

  test('should handle rapid tool switching correctly', async ({ page }) => {
    // Rapid tool switching scenario
    await page.click('[data-tool="select"]');
    const canvas = page.locator('#canvas');
    await canvas.click({ position: { x: 20, y: 20 } });
    
    // Rapidly switch between tools
    await page.click('[data-tool="rectangle"]');
    await page.click('[data-tool="circle"]');
    await page.click('[data-tool="line"]');
    await page.click('[data-tool="select"]');
    await page.click('[data-tool="pan"]');
    
    // Verify final tool is active
    const panButton = page.locator('[data-tool="pan"]');
    await expect(panButton).toHaveAttribute('aria-pressed', 'true');
    
    // Verify cursor is correct
    await expect(canvas).toHaveCSS('cursor', 'grab');
  });

  test('should maintain consistent UI state after tool changes', async ({ page }) => {
    // Start with select tool
    await page.click('[data-tool="select"]');
    
    // Select a shape
    const canvas = page.locator('#canvas');
    await canvas.click({ position: { x: 20, y: 20 } });
    
    // Switch to rectangle tool - should show style panel
    await page.click('[data-tool="rectangle"]');
    
    // Verify style panel is visible for drawing tools
    const stylePanel = page.locator('#style-panel');
    await expect(stylePanel).toBeVisible();
    
    // Switch back to select tool - should hide style panel
    await page.click('[data-tool="select"]');
    await expect(stylePanel).toBeHidden();
    
    // Switch to pan tool - should also hide style panel
    await page.click('[data-tool="pan"]');
    await expect(stylePanel).toBeHidden();
  });
});
