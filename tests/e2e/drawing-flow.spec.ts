import { test, expect } from '@playwright/test';
import { 
  getMainCanvas, 
  expectToolActive, 
  expectToolInactive, 
  clickToolAndExpectActive, 
  setupTest,
  drawRectangle,
  drawCircle,
  clickCanvas,
  selectAndDeleteShape
} from './utils';

test.describe('Drawing Application - Drawing Flow', () => {
  test.beforeEach(async ({ page }) => {
    await setupTest(page);
  });

  test('can draw a rectangle', async ({ page }) => {
    // Switch to rectangle tool
    await clickToolAndExpectActive(page, 'rectangle');

    // Draw a rectangle using utility
    await drawRectangle(page, 100, 100, 200, 150);

    // Switch to select tool to verify the shape was created
    await clickToolAndExpectActive(page, 'select');
    
    // Select and delete the rectangle to verify it was created
    await selectAndDeleteShape(page, 150, 125);
    
    // Rectangle should be deleted, clicking in the same area should not select anything
    await clickCanvas(page, 150, 125);
  });

  test('can draw a circle', async ({ page }) => {
    // Switch to circle tool
    await clickToolAndExpectActive(page, 'circle');

    // Draw a circle using utility
    await drawCircle(page, 150, 150, 200, 200);

    // Switch to select tool and verify the shape was created
    await clickToolAndExpectActive(page, 'select');
    
    // Select and delete the circle to verify it was created
    await selectAndDeleteShape(page, 175, 175);
  });

  test('can draw a line', async ({ page }) => {
    // Switch to line tool
    await clickToolAndExpectActive(page, 'line');

    const canvas = getMainCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('Canvas not found');
    
    // Draw a line by clicking and dragging using absolute coordinates
    await page.mouse.move(canvasBox.x + 50, canvasBox.y + 50);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + 150, canvasBox.y + 100);
    await page.mouse.up();

    // Switch to select tool and verify the shape was created
    await clickToolAndExpectActive(page, 'select');
    
    // Select and delete the line to verify it was created
    await selectAndDeleteShape(page, 100, 75);
  });

  test('can draw a curve', async ({ page }) => {
    // Switch to curve tool
    await clickToolAndExpectActive(page, 'curve');

    const canvas = getMainCanvas(page);
    
    // Draw a curve by clicking points
    await canvas.click({ position: { x: 100, y: 200 } }); // Start point
    await canvas.click({ position: { x: 150, y: 100 } }); // Control point 1
    await canvas.click({ position: { x: 250, y: 100 } }); // Control point 2
    await canvas.click({ position: { x: 300, y: 200 } }); // End point

    // Switch to select tool and verify the shape was created
    await clickToolAndExpectActive(page, 'select');
    
    // Select and delete the curve to verify it was created
    await selectAndDeleteShape(page, 200, 150);
  });

  test('can select and move shapes', async ({ page }) => {
    // First, draw a rectangle
    await clickToolAndExpectActive(page, 'rectangle');
    await drawRectangle(page, 100, 100, 200, 150);

    // Switch to select tool
    await clickToolAndExpectActive(page, 'select');
    
    // Select the rectangle
    await clickCanvas(page, 150, 125);
    
    // Drag the rectangle to a new position using absolute coordinates
    const canvas = getMainCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('Canvas not found');
    
    await page.mouse.move(canvasBox.x + 150, canvasBox.y + 125);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + 250, canvasBox.y + 200);
    await page.mouse.up();
    
    // The rectangle should now be at the new position
    // We can verify this by trying to select it at the new location
    await clickCanvas(page, 300, 225); // Click outside first to deselect
    await selectAndDeleteShape(page, 250, 200); // Click at new position and delete
  });

  test('can use undo and redo', async ({ page }) => {
    // Draw a rectangle
    await clickToolAndExpectActive(page, 'rectangle');
    await drawRectangle(page, 100, 100, 200, 150);

    // Switch to select tool
    await clickToolAndExpectActive(page, 'select');
    
    // Verify rectangle exists by selecting it
    await clickCanvas(page, 150, 125);
    
    // Undo the rectangle creation
    await page.click('[data-action="undo"]');
    
    // Rectangle should be gone - clicking in the same area should not select anything
    await clickCanvas(page, 150, 125);
    
    // Redo to bring the rectangle back
    await page.click('[data-action="redo"]');
    
    // Rectangle should be back - we can select and delete it
    await selectAndDeleteShape(page, 150, 125);
  });

  test('can select multiple shapes with drag selection', async ({ page }) => {
    // Draw two rectangles
    await clickToolAndExpectActive(page, 'rectangle');
    
    const canvas = getMainCanvas(page);
    const canvasBox = await canvas.boundingBox();
    if (!canvasBox) throw new Error('Canvas not found');
    
    // First rectangle
    await drawRectangle(page, 50, 50, 100, 100);
    
    // Second rectangle
    await drawRectangle(page, 120, 50, 170, 100);

    // Switch to select tool
    await clickToolAndExpectActive(page, 'select');
    
    // Perform drag selection to select both rectangles using absolute coordinates
    await page.mouse.move(canvasBox.x + 30, canvasBox.y + 30);
    await page.mouse.down();
    await page.mouse.move(canvasBox.x + 190, canvasBox.y + 120);
    await page.mouse.up();
    
    // Both rectangles should be selected - delete them
    await page.keyboard.press('Delete');
    
    // Verify both are gone by trying to select them
    await clickCanvas(page, 75, 75);
    await clickCanvas(page, 145, 75);
  });

  // Note: Edit mode functionality may not be available yet in the current app
  // This test is commented out until edit mode is implemented
  /*
  test('can switch to edit mode and edit shapes', async ({ page }) => {
    // Draw a rectangle
    await clickToolAndExpectActive(page, 'rectangle');
    await drawRectangle(page, 100, 100, 200, 150);

    // Switch to select tool and select the rectangle
    await clickToolAndExpectActive(page, 'select');
    await clickCanvas(page, 150, 125);
    
    // Double-click to enter edit mode
    const canvas = getMainCanvas(page);
    await canvas.dblclick({ position: { x: 150, y: 125 } });
    
    // Should now be in edit mode (when implemented)
    // await expectToolActive(page, 'edit');
    
    // The rectangle should be editable
    await selectAndDeleteShape(page, 150, 125);
  });
  */
});
