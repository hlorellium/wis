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
