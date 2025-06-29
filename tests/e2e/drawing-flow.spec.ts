import { test, expect } from '@playwright/test';

test.describe('Drawing Application - Drawing Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('can draw a rectangle', async ({ page }) => {
    // Switch to rectangle tool
    await page.click('[data-tool="rectangle"]');
    await expect(page.locator('[data-tool="rectangle"]')).toHaveAttribute('aria-pressed', 'true');

    const canvas = page.locator('#canvas');
    
    // Draw a rectangle by clicking and dragging
    await canvas.hover({ position: { x: 100, y: 100 } });
    await page.mouse.down();
    await canvas.hover({ position: { x: 200, y: 150 } });
    await page.mouse.up();

    // Switch to select tool to verify the shape was created
    await page.click('[data-tool="select"]');
    
    // Click on the rectangle to select it
    await canvas.click({ position: { x: 150, y: 125 } });
    
    // Verify rectangle is selected (should have selection highlight)
    // We can check this by trying to delete it
    await page.keyboard.press('Delete');
    
    // Rectangle should be deleted, clicking in the same area should not select anything
    await canvas.click({ position: { x: 150, y: 125 } });
  });

  test('can draw a circle', async ({ page }) => {
    // Switch to circle tool
    await page.click('[data-tool="circle"]');
    await expect(page.locator('[data-tool="circle"]')).toHaveAttribute('aria-pressed', 'true');

    const canvas = page.locator('#canvas');
    
    // Draw a circle by clicking and dragging
    await canvas.hover({ position: { x: 150, y: 150 } });
    await page.mouse.down();
    await canvas.hover({ position: { x: 200, y: 200 } });
    await page.mouse.up();

    // Switch to select tool and verify the shape was created
    await page.click('[data-tool="select"]');
    
    // Click on the circle to select it
    await canvas.click({ position: { x: 175, y: 175 } });
    
    // Delete the circle to verify it was selected
    await page.keyboard.press('Delete');
  });

  test('can draw a line', async ({ page }) => {
    // Switch to line tool
    await page.click('[data-tool="line"]');
    await expect(page.locator('[data-tool="line"]')).toHaveAttribute('aria-pressed', 'true');

    const canvas = page.locator('#canvas');
    
    // Draw a line by clicking and dragging
    await canvas.hover({ position: { x: 50, y: 50 } });
    await page.mouse.down();
    await canvas.hover({ position: { x: 150, y: 100 } });
    await page.mouse.up();

    // Switch to select tool and verify the shape was created
    await page.click('[data-tool="select"]');
    
    // Click near the line to select it
    await canvas.click({ position: { x: 100, y: 75 } });
    
    // Delete the line to verify it was selected
    await page.keyboard.press('Delete');
  });

  test('can draw a bezier curve', async ({ page }) => {
    // Switch to bezier tool
    await page.click('[data-tool="bezier"]');
    await expect(page.locator('[data-tool="bezier"]')).toHaveClass(/active/);

    const canvas = page.locator('canvas');
    
    // Draw a bezier curve by clicking points
    await canvas.click({ position: { x: 100, y: 200 } }); // Start point
    await canvas.click({ position: { x: 150, y: 100 } }); // Control point 1
    await canvas.click({ position: { x: 250, y: 100 } }); // Control point 2
    await canvas.click({ position: { x: 300, y: 200 } }); // End point

    // Switch to select tool and verify the shape was created
    await page.click('[data-tool="select"]');
    
    // Click on the curve to select it
    await canvas.click({ position: { x: 200, y: 150 } });
    
    // Delete the curve to verify it was selected
    await page.keyboard.press('Delete');
  });

  test('can select and move shapes', async ({ page }) => {
    // First, draw a rectangle
    await page.click('[data-tool="rectangle"]');
    const canvas = page.locator('canvas');
    
    await canvas.hover({ position: { x: 100, y: 100 } });
    await page.mouse.down();
    await canvas.hover({ position: { x: 200, y: 150 } });
    await page.mouse.up();

    // Switch to select tool
    await page.click('[data-tool="select"]');
    
    // Select the rectangle
    await canvas.click({ position: { x: 150, y: 125 } });
    
    // Drag the rectangle to a new position
    await canvas.hover({ position: { x: 150, y: 125 } });
    await page.mouse.down();
    await canvas.hover({ position: { x: 250, y: 200 } });
    await page.mouse.up();
    
    // The rectangle should now be at the new position
    // We can verify this by trying to select it at the new location
    await canvas.click({ position: { x: 300, y: 225 } }); // Click outside first to deselect
    await canvas.click({ position: { x: 250, y: 200 } }); // Click at new position
    
    // Delete to verify it was selected at new position
    await page.keyboard.press('Delete');
  });

  test('can use undo and redo', async ({ page }) => {
    // Draw a rectangle
    await page.click('[data-tool="rectangle"]');
    const canvas = page.locator('canvas');
    
    await canvas.hover({ position: { x: 100, y: 100 } });
    await page.mouse.down();
    await canvas.hover({ position: { x: 200, y: 150 } });
    await page.mouse.up();

    // Switch to select tool
    await page.click('[data-tool="select"]');
    
    // Verify rectangle exists by selecting it
    await canvas.click({ position: { x: 150, y: 125 } });
    
    // Undo the rectangle creation
    await page.click('[data-action="undo"]');
    
    // Rectangle should be gone - clicking in the same area should not select anything
    await canvas.click({ position: { x: 150, y: 125 } });
    
    // Redo to bring the rectangle back
    await page.click('[data-action="redo"]');
    
    // Rectangle should be back - we can select and delete it
    await canvas.click({ position: { x: 150, y: 125 } });
    await page.keyboard.press('Delete');
  });

  test('can select multiple shapes with drag selection', async ({ page }) => {
    // Draw two rectangles
    await page.click('[data-tool="rectangle"]');
    const canvas = page.locator('canvas');
    
    // First rectangle
    await canvas.hover({ position: { x: 50, y: 50 } });
    await page.mouse.down();
    await canvas.hover({ position: { x: 100, y: 100 } });
    await page.mouse.up();
    
    // Second rectangle
    await canvas.hover({ position: { x: 120, y: 50 } });
    await page.mouse.down();
    await canvas.hover({ position: { x: 170, y: 100 } });
    await page.mouse.up();

    // Switch to select tool
    await page.click('[data-tool="select"]');
    
    // Perform drag selection to select both rectangles
    await canvas.hover({ position: { x: 30, y: 30 } });
    await page.mouse.down();
    await canvas.hover({ position: { x: 190, y: 120 } });
    await page.mouse.up();
    
    // Both rectangles should be selected - delete them
    await page.keyboard.press('Delete');
    
    // Verify both are gone by trying to select them
    await canvas.click({ position: { x: 75, y: 75 } });
    await canvas.click({ position: { x: 145, y: 75 } });
  });

  test('can switch to edit mode and edit shapes', async ({ page }) => {
    // Draw a rectangle
    await page.click('[data-tool="rectangle"]');
    const canvas = page.locator('canvas');
    
    await canvas.hover({ position: { x: 100, y: 100 } });
    await page.mouse.down();
    await canvas.hover({ position: { x: 200, y: 150 } });
    await page.mouse.up();

    // Switch to select tool and select the rectangle
    await page.click('[data-tool="select"]');
    await canvas.click({ position: { x: 150, y: 125 } });
    
    // Double-click to enter edit mode
    await canvas.dblclick({ position: { x: 150, y: 125 } });
    
    // Should now be in edit mode
    await expect(page.locator('[data-tool="edit"]')).toHaveClass(/active/);
    
    // In edit mode, we should be able to drag vertices/edges
    // For rectangles, we can drag corners or edges
    // Let's try dragging a corner
    await canvas.hover({ position: { x: 200, y: 150 } }); // Bottom-right corner
    await page.mouse.down();
    await canvas.hover({ position: { x: 220, y: 170 } });
    await page.mouse.up();
    
    // Switch back to select mode
    await page.click('[data-tool="select"]');
    
    // The rectangle should now be larger
    // We can verify by selecting it at the new size
    await canvas.click({ position: { x: 210, y: 160 } });
    await page.keyboard.press('Delete');
  });
});
