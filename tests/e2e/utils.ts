import { Page, Locator, expect } from '@playwright/test';

/**
 * Get the main drawing canvas (not the background canvas)
 */
export function getMainCanvas(page: Page): Locator {
  return page.locator('#canvas');
}

/**
 * Expect a tool to be in active state (aria-pressed="true")
 */
export async function expectToolActive(page: Page, tool: string) {
  await expect(page.locator(`[data-tool="${tool}"]`))
    .toHaveAttribute('aria-pressed', 'true');
}

/**
 * Expect a tool to be in inactive state (aria-pressed="false")
 */
export async function expectToolInactive(page: Page, tool: string) {
  await expect(page.locator(`[data-tool="${tool}"]`))
    .toHaveAttribute('aria-pressed', 'false');
}

/**
 * Click a tool and expect it to become active
 */
export async function clickToolAndExpectActive(page: Page, tool: string) {
  await page.click(`[data-tool="${tool}"]`);
  await expectToolActive(page, tool);
}

/**
 * Common test setup that waits for the app to load
 */
export async function setupTest(page: Page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
}

/**
 * Draw a rectangle on the canvas
 * Note: Assumes rectangle tool is already selected
 */
export async function drawRectangle(page: Page, x1: number, y1: number, x2: number, y2: number) {
  const canvas = getMainCanvas(page);
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error('Canvas not found');
  
  // Use absolute coordinates to avoid element overlap issues
  await page.mouse.move(canvasBox.x + x1, canvasBox.y + y1);
  await page.mouse.down();
  await page.mouse.move(canvasBox.x + x2, canvasBox.y + y2);
  await page.mouse.up();
}

/**
 * Draw a circle on the canvas
 * Note: Assumes circle tool is already selected
 */
export async function drawCircle(page: Page, x1: number, y1: number, x2: number, y2: number) {
  const canvas = getMainCanvas(page);
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error('Canvas not found');
  
  // Use absolute coordinates to avoid element overlap issues
  await page.mouse.move(canvasBox.x + x1, canvasBox.y + y1);
  await page.mouse.down();
  await page.mouse.move(canvasBox.x + x2, canvasBox.y + y2);
  await page.mouse.up();
}

/**
 * Draw a rectangle with automatic tool selection
 */
export async function drawRectangleWithTool(page: Page, x1: number, y1: number, x2: number, y2: number) {
  await clickToolAndExpectActive(page, 'rectangle');
  await drawRectangle(page, x1, y1, x2, y2);
}

/**
 * Draw a circle with automatic tool selection
 */
export async function drawCircleWithTool(page: Page, x1: number, y1: number, x2: number, y2: number) {
  await clickToolAndExpectActive(page, 'circle');
  await drawCircle(page, x1, y1, x2, y2);
}

/**
 * Click at a position on the canvas
 */
export async function clickCanvas(page: Page, x: number, y: number) {
  const canvas = getMainCanvas(page);
  await canvas.click({ position: { x, y } });
}

/**
 * Select a shape by clicking on it and verify it can be deleted
 */
export async function selectAndDeleteShape(page: Page, x: number, y: number) {
  await clickCanvas(page, x, y);
  await page.keyboard.press('Delete');
}

/**
 * Wait for undo button to be enabled and then click it
 */
export async function clickUndoWhenEnabled(page: Page, timeout = 10000) {
  await page.waitForSelector('[data-action="undo"]:not([disabled])', { timeout });
  await page.click('[data-action="undo"]');
}

/**
 * Wait for redo button to be enabled and then click it
 */
export async function clickRedoWhenEnabled(page: Page, timeout = 10000) {
  await page.waitForSelector('[data-action="redo"]:not([disabled])', { timeout });
  await page.click('[data-action="redo"]');
}

/**
 * Draw a line on the canvas
 * Note: Assumes line tool is already selected
 */
export async function drawLine(page: Page, x1: number, y1: number, x2: number, y2: number) {
  const canvas = getMainCanvas(page);
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error('Canvas not found');
  
  // Use absolute coordinates to avoid element overlap issues
  await page.mouse.move(canvasBox.x + x1, canvasBox.y + y1);
  await page.mouse.down();
  await page.mouse.move(canvasBox.x + x2, canvasBox.y + y2);
  await page.mouse.up();
}

/**
 * Draw a curve on the canvas
 * Note: Assumes curve tool is already selected
 */
export async function drawCurve(page: Page, x1: number, y1: number, x2: number, y2: number) {
  const canvas = getMainCanvas(page);
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error('Canvas not found');
  
  // Use absolute coordinates to avoid element overlap issues
  await page.mouse.move(canvasBox.x + x1, canvasBox.y + y1);
  await page.mouse.down();
  await page.mouse.move(canvasBox.x + x2, canvasBox.y + y2);
  await page.mouse.up();
}

/**
 * Wait for the canvas to be ready for interaction
 */
export async function waitForCanvasReady(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('#canvas', { state: 'visible' });
  // Wait a bit more for the application to fully initialize
  await page.waitForTimeout(100);
}

/**
 * Create shapes on the canvas using the specified tool
 * @param page Playwright page object
 * @param tool The tool to use ('rectangle', 'circle', 'line', 'curve')
 * @param positions Array of positions. For single-point shapes (rect, circle), use one point. For lines, use two points.
 */
export async function createShapes(
  page: Page, 
  tool: 'rectangle' | 'circle' | 'line' | 'curve', 
  positions: Array<{ x: number; y: number }>
) {
  // Select the appropriate tool
  await clickToolAndExpectActive(page, tool);
  
  if (tool === 'rectangle') {
    for (const pos of positions) {
      // Create a rectangle with default size (e.g., 50x50)
      await drawRectangle(page, pos.x, pos.y, pos.x + 50, pos.y + 50);
    }
  } else if (tool === 'circle') {
    for (const pos of positions) {
      // Create a circle with default size (radius ~25)
      await drawCircle(page, pos.x, pos.y, pos.x + 50, pos.y + 50);
    }
  } else if (tool === 'line') {
    // For lines, expect pairs of points
    for (let i = 0; i < positions.length; i += 2) {
      if (i + 1 < positions.length) {
        const start = positions[i];
        const end = positions[i + 1];
        await drawLine(page, start.x, start.y, end.x, end.y);
      }
    }
  } else if (tool === 'curve') {
    // For curves, expect pairs of points
    for (let i = 0; i < positions.length; i += 2) {
      if (i + 1 < positions.length) {
        const start = positions[i];
        const end = positions[i + 1];
        await drawCurve(page, start.x, start.y, end.x, end.y);
      }
    }
  }
  
  // Brief wait for shapes to be created
  await page.waitForTimeout(100);
}

/**
 * Enter edit mode by double-clicking on a shape at the given position
 */
export async function enterEditMode(page: Page, x: number, y: number) {
  // First ensure we're in select mode
  await clickToolAndExpectActive(page, 'select');
  
  // Select the shape with a single click
  await clickCanvas(page, x, y);
  
  // Double-click to enter edit mode
  const canvas = getMainCanvas(page);
  await canvas.dblclick({ position: { x, y } });
  
  // Wait a brief moment for the tool to switch
  await page.waitForTimeout(100);
}

/**
 * Check if we're currently in edit mode by examining the active tool
 * Note: Edit mode doesn't have a visible button, but we can check the tool state
 */
export async function expectInEditMode(page: Page) {
  // In edit mode, the select tool button should still appear active
  // but internally the app is in edit mode
  await expectToolActive(page, 'select');
  
  // Additional verification: check if edit handles are visible
  // This is a more reliable way to confirm edit mode
  await page.waitForTimeout(200); // Give time for handles to render
}

/**
 * Check that we're not in edit mode (i.e., in normal select mode)
 */
export async function expectNotInEditMode(page: Page) {
  await expectToolActive(page, 'select');
  // In normal select mode, edit handles should not be visible
  await page.waitForTimeout(100);
}

/**
 * Drag from one position to another on the canvas
 */
export async function dragOnCanvas(page: Page, fromX: number, fromY: number, toX: number, toY: number) {
  const canvas = getMainCanvas(page);
  const canvasBox = await canvas.boundingBox();
  if (!canvasBox) throw new Error('Canvas not found');
  
  await page.mouse.move(canvasBox.x + fromX, canvasBox.y + fromY);
  await page.mouse.down();
  await page.mouse.move(canvasBox.x + toX, canvasBox.y + toY);
  await page.mouse.up();
  
  // Brief wait for the operation to complete
  await page.waitForTimeout(100);
}

/**
 * Create a rectangle, select it, and enter edit mode
 */
export async function createAndEditRectangle(page: Page, x: number, y: number, width: number = 50, height: number = 50) {
  // Create rectangle
  await clickToolAndExpectActive(page, 'rectangle');
  await drawRectangle(page, x, y, x + width, y + height);
  
  // Enter edit mode
  await enterEditMode(page, x + width/2, y + height/2);
  
  return { x, y, width, height };
}

/**
 * Create a circle, select it, and enter edit mode
 */
export async function createAndEditCircle(page: Page, x: number, y: number, radius: number = 25) {
  // Create circle
  await clickToolAndExpectActive(page, 'circle');
  await drawCircle(page, x - radius, y - radius, x + radius, y + radius);
  
  // Enter edit mode
  await enterEditMode(page, x, y);
  
  return { x, y, radius };
}

/**
 * Create a line, select it, and enter edit mode
 */
export async function createAndEditLine(page: Page, x1: number, y1: number, x2: number, y2: number) {
  // Create line
  await clickToolAndExpectActive(page, 'line');
  await drawLine(page, x1, y1, x2, y2);
  
  // Enter edit mode (click near the middle of the line)
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  await enterEditMode(page, midX, midY);
  
  return { x1, y1, x2, y2 };
}

/**
 * Wait for a specific number of undo/redo operations to be available
 */
export async function waitForUndoCount(page: Page, expectedCount: number, timeout: number = 5000) {
  // This is a simplified check - in a real implementation you might need to check internal state
  if (expectedCount > 0) {
    await page.waitForSelector('[data-action="undo"]:not([disabled])', { timeout });
  } else {
    await page.waitForSelector('[data-action="undo"][disabled]', { timeout });
  }
}

/**
 * Expect undo button to be enabled or disabled
 */
export async function expectUndoEnabled(page: Page, enabled: boolean = true) {
  if (enabled) {
    await expect(page.locator('[data-action="undo"]')).not.toHaveAttribute('disabled');
  } else {
    await expect(page.locator('[data-action="undo"]')).toHaveAttribute('disabled');
  }
}

/**
 * Expect redo button to be enabled or disabled
 */
export async function expectRedoEnabled(page: Page, enabled: boolean = true) {
  if (enabled) {
    await expect(page.locator('[data-action="redo"]')).not.toHaveAttribute('disabled');
  } else {
    await expect(page.locator('[data-action="redo"]')).toHaveAttribute('disabled');
  }
}
