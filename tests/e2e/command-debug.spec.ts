import { test, expect } from '@playwright/test';
import { 
  setupTest,
  clickToolAndExpectActive,
  drawRectangle
} from './utils';

test.describe('Command System Debug', () => {
  test.beforeEach(async ({ page }) => {
    await setupTest(page);
  });

  test('debug: test basic rectangle drawing and commands', async ({ page }) => {
    console.log('Starting rectangle drawing test...');
    
    // Check canvas dimensions and position
    const canvasInfo = await page.evaluate(() => {
      const canvas = document.querySelector('#canvas') as HTMLCanvasElement;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      return {
        exists: true,
        width: canvas.width,
        height: canvas.height,
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
      };
    });
    
    console.log('Canvas info:', canvasInfo);
    
    // Click rectangle tool
    await clickToolAndExpectActive(page, 'rectangle');
    console.log('Rectangle tool selected');
    
    // Wait for tool to be fully active
    await page.waitForTimeout(200);
    
    // Try a direct mouse interaction on the canvas
    await page.evaluate(() => {
      const canvas = document.querySelector('#canvas') as HTMLCanvasElement;
      if (canvas) {
        console.log('Manually triggering mouse events on canvas');
        
        // Simulate mousedown
        const mouseDown = new MouseEvent('mousedown', {
          clientX: 150, clientY: 150, button: 0, bubbles: true
        });
        canvas.dispatchEvent(mouseDown);
        console.log('Dispatched mousedown event');
        
        // Simulate mousemove (important for drawing tools!)
        setTimeout(() => {
          const mouseMove = new MouseEvent('mousemove', {
            clientX: 175, clientY: 175, button: 0, bubbles: true
          });
          window.dispatchEvent(mouseMove); // mousemove is on window, not canvas
          console.log('Dispatched mousemove event');
        }, 50);
        
        // Wait a bit and simulate mouseup
        setTimeout(() => {
          const mouseUp = new MouseEvent('mouseup', {
            clientX: 200, clientY: 200, button: 0, bubbles: true
          });
          window.dispatchEvent(mouseUp); // mouseup is on window, not canvas
          console.log('Dispatched mouseup event');
        }, 100);
      }
    });
    
    await page.waitForTimeout(500);
    
    // Check if any shapes were created
    const shapeCount = await page.evaluate(() => {
      // Try to access app state through global scope if possible
      return document.querySelectorAll('canvas').length;
    });
    
    console.log('Found canvases:', shapeCount);
    
    // Check undo button
    const undoButton = page.locator('[data-action="undo"]');
    const isUndoDisabled = await undoButton.getAttribute('disabled');
    
    console.log('Undo button disabled:', isUndoDisabled !== null);
    
    if (isUndoDisabled !== null) {
      console.log('ISSUE: Drawing operation did not create undo entry');
      await page.screenshot({ path: 'debug-drawing-failed.png' });
    } else {
      console.log('SUCCESS: Undo button is enabled');
    }
    
    expect(true).toBe(true);
  });

  test('debug: check if MouseHandler is initialized', async ({ page }) => {
    await page.evaluate(() => {
      // Check if we can access any mouse event handlers
      const canvas = document.querySelector('#canvas') as HTMLCanvasElement;
      if (canvas) {
        console.log('DEBUG: Canvas found, checking event listeners');
        
        // Trigger a test mouse event to see if handlers are attached
        const event = new MouseEvent('mousedown', {
          clientX: 150,
          clientY: 125,
          button: 0
        });
        
        console.log('DEBUG: Dispatching test mouse event');
        canvas.dispatchEvent(event);
      } else {
        console.log('DEBUG: Canvas not found');
      }
    });
    
    await page.waitForTimeout(200);
    expect(true).toBe(true);
  });
});
