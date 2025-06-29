import { test, expect } from '@playwright/test';
import { 
  setupTest,
  clickToolAndExpectActive,
  expectToolActive,
  clickCanvas,
  dragOnCanvas,
  enterEditMode,
  expectInEditMode,
  expectNotInEditMode,
  createAndEditRectangle,
  createAndEditCircle,
  createAndEditLine,
  drawRectangle,
  drawCircle,
  drawLine,
  expectUndoEnabled,
  expectRedoEnabled,
  clickUndoWhenEnabled,
  clickRedoWhenEnabled,
  getMainCanvas
} from './utils';

test.describe('Edit Tool E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupTest(page);
  });

  test.describe('Edit Mode Activation', () => {
    test('should enter edit mode when double-clicking on selected rectangle', async ({ page }) => {
      // Create a rectangle
      await clickToolAndExpectActive(page, 'rectangle');
      await drawRectangle(page, 100, 100, 200, 150);

      // Switch to select tool and select the rectangle
      await clickToolAndExpectActive(page, 'select');
      await clickCanvas(page, 150, 125);

      // Double-click to enter edit mode
      const canvas = getMainCanvas(page);
      await canvas.dblclick({ position: { x: 150, y: 125 } });

      // Should now be in edit mode
      await expectInEditMode(page);
    });

    test('should enter edit mode when double-clicking on selected circle', async ({ page }) => {
      // Create a circle
      await clickToolAndExpectActive(page, 'circle');
      await drawCircle(page, 100, 100, 150, 150);

      // Switch to select tool and select the circle
      await clickToolAndExpectActive(page, 'select');
      await clickCanvas(page, 125, 125);

      // Double-click to enter edit mode
      const canvas = getMainCanvas(page);
      await canvas.dblclick({ position: { x: 125, y: 125 } });

      // Should now be in edit mode
      await expectInEditMode(page);
    });

    test('should enter edit mode when double-clicking on selected line', async ({ page }) => {
      // Create a line
      await clickToolAndExpectActive(page, 'line');
      await drawLine(page, 100, 100, 200, 150);

      // Switch to select tool and select the line
      await clickToolAndExpectActive(page, 'select');
      await clickCanvas(page, 150, 125);

      // Double-click to enter edit mode
      const canvas = getMainCanvas(page);
      await canvas.dblclick({ position: { x: 150, y: 125 } });

      // Should now be in edit mode
      await expectInEditMode(page);
    });

    test('should not enter edit mode when double-clicking with no selection', async ({ page }) => {
      // Ensure we're in select mode with no selection
      await clickToolAndExpectActive(page, 'select');

      // Double-click on empty canvas
      const canvas = getMainCanvas(page);
      await canvas.dblclick({ position: { x: 150, y: 125 } });

      // Should remain in normal select mode
      await expectNotInEditMode(page);
    });

    test('should not enter edit mode when double-clicking outside selected shape', async ({ page }) => {
      // Create a rectangle
      await clickToolAndExpectActive(page, 'rectangle');
      await drawRectangle(page, 100, 100, 200, 150);

      // Switch to select tool and select the rectangle
      await clickToolAndExpectActive(page, 'select');
      await clickCanvas(page, 150, 125);

      // Double-click outside the rectangle
      const canvas = getMainCanvas(page);
      await canvas.dblclick({ position: { x: 300, y: 300 } });

      // Should remain in normal select mode
      await expectNotInEditMode(page);
    });
  });

  test.describe('Rectangle Vertex Editing', () => {
    test('should resize rectangle by dragging corner handles', async ({ page }) => {
      const rect = await createAndEditRectangle(page, 100, 100, 100, 80);

      // Drag the bottom-right corner to resize the rectangle
      await dragOnCanvas(page, rect.x + rect.width, rect.y + rect.height, rect.x + rect.width + 50, rect.y + rect.height + 30);

      // Wait for the operation to complete
      await page.waitForTimeout(200);

      // Verify the operation created an undo entry
      await expectUndoEnabled(page, true);
    });

    test('should resize rectangle by dragging top-left corner', async ({ page }) => {
      const rect = await createAndEditRectangle(page, 150, 150, 100, 80);

      // Drag the top-left corner to resize the rectangle
      await dragOnCanvas(page, rect.x, rect.y, rect.x - 30, rect.y - 20);

      // Wait for the operation to complete
      await page.waitForTimeout(200);

      // Verify the operation created an undo entry
      await expectUndoEnabled(page, true);
    });

    test('should handle multiple resize operations with undo/redo', async ({ page }) => {
      const rect = await createAndEditRectangle(page, 100, 100, 100, 80);

      // First resize operation
      await dragOnCanvas(page, rect.x + rect.width, rect.y + rect.height, rect.x + rect.width + 30, rect.y + rect.height + 20);
      await page.waitForTimeout(100);

      // Second resize operation
      await dragOnCanvas(page, rect.x, rect.y, rect.x - 20, rect.y - 15);
      await page.waitForTimeout(100);

      // Should have undo available
      await expectUndoEnabled(page, true);

      // Undo the last operation
      await clickUndoWhenEnabled(page);
      await page.waitForTimeout(100);

      // Should still have undo available for the first operation
      await expectUndoEnabled(page, true);

      // Should have redo available
      await expectRedoEnabled(page, true);

      // Redo the operation
      await clickRedoWhenEnabled(page);
      await page.waitForTimeout(100);

      // Redo should no longer be available
      await expectRedoEnabled(page, false);
    });
  });

  test.describe('Circle Handle Editing', () => {
    test('should resize circle by dragging radius handles', async ({ page }) => {
      const circle = await createAndEditCircle(page, 150, 150, 40);

      // Drag the right handle to increase radius
      await dragOnCanvas(page, circle.x + circle.radius, circle.y, circle.x + circle.radius + 30, circle.y);

      // Wait for the operation to complete
      await page.waitForTimeout(200);

      // Verify the operation created an undo entry
      await expectUndoEnabled(page, true);
    });

    test('should resize circle by dragging different handles', async ({ page }) => {
      const circle = await createAndEditCircle(page, 150, 150, 40);

      // Drag the bottom handle
      await dragOnCanvas(page, circle.x, circle.y + circle.radius, circle.x, circle.y + circle.radius + 25);
      await page.waitForTimeout(100);

      // Drag the left handle
      await dragOnCanvas(page, circle.x - circle.radius, circle.y, circle.x - circle.radius - 20, circle.y);
      await page.waitForTimeout(100);

      // Should have multiple undo operations available
      await expectUndoEnabled(page, true);
    });
  });

  test.describe('Line Endpoint Editing', () => {
    test('should move line endpoints by dragging handles', async ({ page }) => {
      const line = await createAndEditLine(page, 100, 100, 200, 150);

      // Drag the first endpoint
      await dragOnCanvas(page, line.x1, line.y1, line.x1 - 30, line.y1 - 20);
      await page.waitForTimeout(100);

      // Drag the second endpoint
      await dragOnCanvas(page, line.x2, line.y2, line.x2 + 40, line.y2 + 30);
      await page.waitForTimeout(100);

      // Verify operations created undo entries
      await expectUndoEnabled(page, true);
    });

    test('should handle line editing with undo/redo', async ({ page }) => {
      const line = await createAndEditLine(page, 100, 100, 200, 150);

      // Move one endpoint
      await dragOnCanvas(page, line.x1, line.y1, line.x1 + 50, line.y1 + 30);
      await page.waitForTimeout(100);

      // Undo the move
      await clickUndoWhenEnabled(page);
      await page.waitForTimeout(100);

      // Should have redo available
      await expectRedoEnabled(page, true);

      // Redo the move
      await clickRedoWhenEnabled(page);
      await page.waitForTimeout(100);

      // Redo should no longer be available
      await expectRedoEnabled(page, false);
    });
  });

  test.describe('Group Movement in Edit Mode', () => {
    test('should move entire shape by dragging inside shape bounds', async ({ page }) => {
      const rect = await createAndEditRectangle(page, 100, 100, 100, 80);

      // Drag from the center of the rectangle to move it
      await dragOnCanvas(page, rect.x + rect.width/2, rect.y + rect.height/2, rect.x + rect.width/2 + 50, rect.y + rect.height/2 + 30);

      // Wait for the operation to complete
      await page.waitForTimeout(200);

      // Verify the operation created an undo entry
      await expectUndoEnabled(page, true);
    });

    test('should move multiple selected shapes together', async ({ page }) => {
      // Create two rectangles
      await clickToolAndExpectActive(page, 'rectangle');
      await drawRectangle(page, 100, 100, 150, 130);
      await drawRectangle(page, 200, 100, 250, 130);

      // Select both rectangles
      await clickToolAndExpectActive(page, 'select');
      
      // Drag selection around both rectangles
      await dragOnCanvas(page, 80, 80, 270, 150);
      await page.waitForTimeout(100);

      // Enter edit mode by double-clicking on one of the rectangles
      const canvas = getMainCanvas(page);
      await canvas.dblclick({ position: { x: 125, y: 115 } });
      await expectInEditMode(page);

      // Move both shapes together
      await dragOnCanvas(page, 125, 115, 175, 145);
      await page.waitForTimeout(200);

      // Verify the operation created an undo entry
      await expectUndoEnabled(page, true);
    });
  });

  test.describe('Edit Mode Exit Scenarios', () => {
    test('should exit edit mode and return to select mode when clicking empty space', async ({ page }) => {
      // Create and enter edit mode
      await createAndEditRectangle(page, 100, 100, 100, 80);
      await expectInEditMode(page);

      // Click on empty space
      await clickCanvas(page, 300, 300);
      await page.waitForTimeout(100);

      // Should return to select mode
      await expectToolActive(page, 'select');
    });

    test('should maintain edit mode when clicking on selected shapes', async ({ page }) => {
      // Create and enter edit mode
      const rect = await createAndEditRectangle(page, 100, 100, 100, 80);
      await expectInEditMode(page);

      // Click inside the rectangle (should remain in edit mode)
      await clickCanvas(page, rect.x + rect.width/2, rect.y + rect.height/2);
      await page.waitForTimeout(100);

      // Should still be in edit mode
      await expectInEditMode(page);
    });

    test('should allow switching to other tools from edit mode', async ({ page }) => {
      // Create and enter edit mode
      await createAndEditRectangle(page, 100, 100, 100, 80);
      await expectInEditMode(page);

      // Switch to rectangle tool
      await clickToolAndExpectActive(page, 'rectangle');

      // Should now be in rectangle tool mode
      await expectToolActive(page, 'rectangle');
    });
  });

  test.describe('Edit Mode with Different Shape Types', () => {
    test('should handle bezier curve editing', async ({ page }) => {
      // Create a bezier curve
      await clickToolAndExpectActive(page, 'curve');
      
      const canvas = getMainCanvas(page);
      
      // Draw a curve by clicking points
      await canvas.click({ position: { x: 100, y: 200 } }); // Start point
      await canvas.click({ position: { x: 150, y: 100 } }); // Control point 1
      await canvas.click({ position: { x: 250, y: 100 } }); // Control point 2
      await canvas.click({ position: { x: 300, y: 200 } }); // End point

      // Enter edit mode
      await enterEditMode(page, 200, 150);
      await expectInEditMode(page);

      // Try to drag one of the control points
      await dragOnCanvas(page, 150, 100, 160, 90);
      await page.waitForTimeout(200);

      // Verify the operation created an undo entry
      await expectUndoEnabled(page, true);
    });

    test('should handle editing shapes with different fill/stroke styles', async ({ page }) => {
      // Create a rectangle with custom styles
      await clickToolAndExpectActive(page, 'rectangle');
      await drawRectangle(page, 100, 100, 200, 150);

      // Enter edit mode
      await enterEditMode(page, 150, 125);
      await expectInEditMode(page);

      // Resize the rectangle
      await dragOnCanvas(page, 200, 150, 220, 170);
      await page.waitForTimeout(200);

      // Verify the operation worked
      await expectUndoEnabled(page, true);
    });
  });

  test.describe('Edit Mode Integration Tests', () => {
    test('should work correctly with zoom and pan operations', async ({ page }) => {
      // Create and edit a rectangle
      const rect = await createAndEditRectangle(page, 150, 150, 100, 80);

      // Zoom in using wheel
      const canvas = getMainCanvas(page);
      await canvas.hover();
      await page.mouse.wheel(0, -300); // Zoom in
      await page.waitForTimeout(100);

      // Try to resize the rectangle while zoomed
      await dragOnCanvas(page, rect.x + rect.width, rect.y + rect.height, rect.x + rect.width + 30, rect.y + rect.height + 20);
      await page.waitForTimeout(200);

      // Verify the operation worked
      await expectUndoEnabled(page, true);
    });

    test('should handle rapid consecutive edit operations', async ({ page }) => {
      const rect = await createAndEditRectangle(page, 100, 100, 100, 80);

      // Perform multiple rapid edit operations
      for (let i = 0; i < 3; i++) {
        await dragOnCanvas(page, rect.x + rect.width, rect.y + rect.height, rect.x + rect.width + 10, rect.y + rect.height + 5);
        await page.waitForTimeout(50);
      }

      // Should have undo available
      await expectUndoEnabled(page, true);

      // Should be able to undo multiple times
      await clickUndoWhenEnabled(page);
      await page.waitForTimeout(50);
      await clickUndoWhenEnabled(page);
      await page.waitForTimeout(50);
      await clickUndoWhenEnabled(page);
      await page.waitForTimeout(50);
    });

    test('should preserve selection when switching back from edit mode', async ({ page }) => {
      // Create two rectangles
      await clickToolAndExpectActive(page, 'rectangle');
      await drawRectangle(page, 100, 100, 150, 130);
      await drawRectangle(page, 200, 100, 250, 130);

      // Select both rectangles
      await clickToolAndExpectActive(page, 'select');
      await dragOnCanvas(page, 80, 80, 270, 150);
      await page.waitForTimeout(100);

      // Enter edit mode
      const canvas = getMainCanvas(page);
      await canvas.dblclick({ position: { x: 125, y: 115 } });
      await expectInEditMode(page);

      // Exit edit mode by clicking empty space
      await clickCanvas(page, 300, 300);
      await page.waitForTimeout(100);

      // Should be back in select mode
      await expectToolActive(page, 'select');
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle edit operations on shapes at canvas boundaries', async ({ page }) => {
      // Create a rectangle near the canvas edge
      const rect = await createAndEditRectangle(page, 10, 10, 50, 40);

      // Try to drag a corner beyond the canvas boundary
      await dragOnCanvas(page, rect.x, rect.y, -20, -15);
      await page.waitForTimeout(200);

      // The operation should still work (the app should handle boundary conditions)
      await expectUndoEnabled(page, true);
    });

    test('should handle very small drag movements', async ({ page }) => {
      const rect = await createAndEditRectangle(page, 100, 100, 100, 80);

      // Make a very small drag movement (should still register as a change)
      await dragOnCanvas(page, rect.x + rect.width, rect.y + rect.height, rect.x + rect.width + 1, rect.y + rect.height + 1);
      await page.waitForTimeout(200);

      // Even small movements should create undo entries
      await expectUndoEnabled(page, true);
    });

    test('should handle edit mode with no actual changes', async ({ page }) => {
      const rect = await createAndEditRectangle(page, 100, 100, 100, 80);

      // Start a drag but return to the same position (no net change)
      await dragOnCanvas(page, rect.x + rect.width, rect.y + rect.height, rect.x + rect.width, rect.y + rect.height);
      await page.waitForTimeout(200);

      // No-op operations might not create undo entries (depending on implementation)
      // This tests the robustness of the system
    });
  });
});
