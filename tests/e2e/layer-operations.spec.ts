import { test, expect } from '@playwright/test';
import { drawRectangle, drawCircle } from './utils';

test.describe('Layer Operations E2E Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // Wait for app to load
        await page.waitForSelector('#canvas', { state: 'visible' });
        await page.waitForTimeout(500);
    });

    test('shapes render in correct zIndex order', async ({ page }) => {
        // Draw three overlapping rectangles
        await page.click('[data-tool="rectangle"]');
        
        // First rectangle (should be at back)
        await drawRectangle(page, 100, 100, 150, 150);
        
        // Second rectangle (should be in middle)
        await drawRectangle(page, 125, 125, 175, 175);
        
        // Third rectangle (should be at front)
        await drawRectangle(page, 150, 150, 200, 200);
        
        // Switch to select tool
        await page.click('[data-tool="select"]');
        
        // Click on the overlapping area - should select the top shape
        await page.click('#canvas', { position: { x: 160, y: 160 } });
        
        // Property inspector should show up with the third rectangle selected
        await expect(page.locator('.property-inspector')).toBeVisible();
        await expect(page.locator('.property-title')).toContainText('Rectangle');
    });

    test('layer controls appear in property inspector', async ({ page }) => {
        // Draw a rectangle
        await page.click('[data-tool="rectangle"]');
        await drawRectangle(page, 100, 100, 200, 200);
        
        // Select the rectangle
        await page.click('[data-tool="select"]');
        await page.click('#canvas', { position: { x: 150, y: 150 } });
        
        // Check that layer controls are visible
        await expect(page.locator('.property-layer-controls')).toBeVisible();
        await expect(page.locator('[data-layer-action="bring-to-front"]')).toBeVisible();
        await expect(page.locator('[data-layer-action="bring-forward"]')).toBeVisible();
        await expect(page.locator('[data-layer-action="send-backward"]')).toBeVisible();
        await expect(page.locator('[data-layer-action="send-to-back"]')).toBeVisible();
    });

    test('bring to front functionality', async ({ page }) => {
        // Draw two overlapping shapes
        await page.click('[data-tool="rectangle"]');
        await drawRectangle(page, 100, 100, 200, 200);
        
        await page.click('[data-tool="circle"]');
        await page.click('#canvas', { position: { x: 80, y: 80 } });
        await page.click('#canvas', { position: { x: 140, y: 140 } });
        
        // Select the rectangle (which should be behind the circle)
        await page.click('[data-tool="select"]');
        await page.click('#canvas', { position: { x: 180, y: 180 } }); // Click on rectangle only area
        
        // Bring rectangle to front
        await page.click('[data-layer-action="bring-to-front"]');
        
        // Now clicking on the overlapping area should select the rectangle
        await page.click('#canvas', { position: { x: 120, y: 120 } });
        await expect(page.locator('.property-title')).toContainText('Rectangle');
    });

    test('send to back functionality', async ({ page }) => {
        // Draw two overlapping shapes
        await page.click('[data-tool="circle"]');
        await page.click('#canvas', { position: { x: 100, y: 100 } });
        await page.click('#canvas', { position: { x: 160, y: 160 } });
        
        await page.click('[data-tool="rectangle"]');
        await drawRectangle(page, 120, 120, 220, 220);
        
        // Select the rectangle (which should be on top)
        await page.click('[data-tool="select"]');
        await page.click('#canvas', { position: { x: 200, y: 200 } }); // Click on rectangle only area
        
        // Send rectangle to back
        await page.click('[data-layer-action="send-to-back"]');
        
        // Now clicking on the overlapping area should select the circle
        await page.click('#canvas', { position: { x: 140, y: 140 } });
        await expect(page.locator('.property-title')).toContainText('Circle');
    });

    test('bring forward functionality', async ({ page }) => {
        // Draw three overlapping rectangles
        await page.click('[data-tool="rectangle"]');
        await drawRectangle(page, 100, 100, 150, 150); // Back
        await drawRectangle(page, 125, 125, 175, 175); // Middle
        await drawRectangle(page, 150, 150, 200, 200); // Front
        
        // Select the middle rectangle
        await page.click('[data-tool="select"]');
        // Click on an area that's only middle rectangle
        await page.click('#canvas', { position: { x: 140, y: 140 } });
        
        // Check selection by looking at coordinates in property inspector
        const xInput = page.locator('[data-property="x"]');
        await expect(xInput).toHaveValue('125');
        
        // Bring forward
        await page.click('[data-layer-action="bring-forward"]');
        
        // Now the middle rectangle should be on top of the front rectangle
        // Click on overlapping area should select the previously middle rectangle
        await page.click('#canvas', { position: { x: 160, y: 160 } });
        await expect(xInput).toHaveValue('125');
    });

    test('send backward functionality', async ({ page }) => {
        // Draw three overlapping rectangles
        await page.click('[data-tool="rectangle"]');
        await drawRectangle(page, 100, 100, 150, 150); // Back
        await drawRectangle(page, 125, 125, 175, 175); // Middle  
        await drawRectangle(page, 150, 150, 200, 200); // Front
        
        // Select the front rectangle
        await page.click('[data-tool="select"]');
        await page.click('#canvas', { position: { x: 180, y: 180 } });
        
        // Verify selection
        const xInput = page.locator('[data-property="x"]');
        await expect(xInput).toHaveValue('150');
        
        // Send backward
        await page.click('[data-layer-action="send-backward"]');
        
        // Now the middle rectangle should be on top
        await page.click('#canvas', { position: { x: 160, y: 160 } });
        await expect(xInput).toHaveValue('125');
    });

    test('multi-selection layer operations', async ({ page }) => {
        // Draw three shapes
        await page.click('[data-tool="rectangle"]');
        await drawRectangle(page, 100, 100, 150, 150);
        await drawRectangle(page, 200, 100, 250, 150);
        await drawRectangle(page, 300, 100, 350, 150);
        
        // Select multiple shapes
        await page.click('[data-tool="select"]');
        await page.keyboard.down('Shift');
        await page.click('#canvas', { position: { x: 125, y: 125 } });
        await page.click('#canvas', { position: { x: 225, y: 125 } });
        await page.keyboard.up('Shift');
        
        // Property inspector should show multiple selection
        await expect(page.locator('.property-title')).toContainText('Multiple Selection');
        await expect(page.locator('.property-id')).toContainText('2 shapes selected');
        
        // Layer controls should still be available
        await expect(page.locator('.property-layer-controls')).toBeVisible();
        
        // Bring to front should work on both
        await page.click('[data-layer-action="bring-to-front"]');
        
        // Both selected shapes should now be on top
        await page.click('#canvas', { position: { x: 125, y: 125 } });
        await expect(page.locator('.property-title')).toContainText('Rectangle');
    });

    test('keyboard shortcuts for layer operations', async ({ page }) => {
        // Draw two overlapping rectangles
        await page.click('[data-tool="rectangle"]');
        await drawRectangle(page, 100, 100, 200, 200);
        await drawRectangle(page, 150, 150, 250, 250);
        
        // Select the first rectangle
        await page.click('[data-tool="select"]');
        await page.click('#canvas', { position: { x: 130, y: 130 } });
        
        // Use keyboard shortcut to bring to front (Ctrl+Shift+])
        await page.keyboard.press('Control+Shift+]');
        
        // First rectangle should now be on top
        await page.click('#canvas', { position: { x: 170, y: 170 } });
        const xInput = page.locator('[data-property="x"]');
        await expect(xInput).toHaveValue('100');
        
        // Use keyboard shortcut to send to back (Ctrl+Shift+[)
        await page.keyboard.press('Control+Shift+[');
        
        // Second rectangle should now be on top
        await page.click('#canvas', { position: { x: 170, y: 170 } });
        await expect(xInput).toHaveValue('150');
    });

    test('layer operations are undoable', async ({ page }) => {
        // Draw two overlapping rectangles
        await page.click('[data-tool="rectangle"]');
        await drawRectangle(page, 100, 100, 200, 200);
        await drawRectangle(page, 150, 150, 250, 250);
        
        // Select the first rectangle and bring to front
        await page.click('[data-tool="select"]');
        await page.click('#canvas', { position: { x: 130, y: 130 } });
        await page.click('[data-layer-action="bring-to-front"]');
        
        // Verify first rectangle is on top
        await page.click('#canvas', { position: { x: 170, y: 170 } });
        let xInput = page.locator('[data-property="x"]');
        await expect(xInput).toHaveValue('100');
        
        // Undo the layer operation
        await page.keyboard.press('Control+z');
        
        // Second rectangle should be back on top
        await page.click('#canvas', { position: { x: 170, y: 170 } });
        await expect(xInput).toHaveValue('150');
        
        // Redo should restore the layer change
        await page.keyboard.press('Control+y');
        await page.click('#canvas', { position: { x: 170, y: 170 } });
        await expect(xInput).toHaveValue('100');
    });

    test('layer order persists after page reload', async ({ page }) => {
        // Draw two overlapping rectangles
        await page.click('[data-tool="rectangle"]');
        await drawRectangle(page, 100, 100, 200, 200);
        await drawRectangle(page, 150, 150, 250, 250);
        
        // Select first rectangle and bring to front
        await page.click('[data-tool="select"]');
        await page.click('#canvas', { position: { x: 130, y: 130 } });
        await page.click('[data-layer-action="bring-to-front"]');
        
        // Wait for persistence
        await page.waitForTimeout(1000);
        
        // Reload the page
        await page.reload();
        await page.waitForSelector('#canvas', { state: 'visible' });
        await page.waitForTimeout(500);
        
        // Layer order should be preserved
        await page.click('[data-tool="select"]');
        await page.click('#canvas', { position: { x: 170, y: 170 } });
        
        const xInput = page.locator('[data-property="x"]');
        await expect(xInput).toHaveValue('100');
    });

    test('new shapes appear on top', async ({ page }) => {
        // Draw a rectangle
        await page.click('[data-tool="rectangle"]');
        await drawRectangle(page, 100, 100, 200, 200);
        
        // Draw a circle overlapping the rectangle
        await page.click('[data-tool="circle"]');
        await page.click('#canvas', { position: { x: 150, y: 150 } });
        await page.click('#canvas', { position: { x: 200, y: 200 } });
        
        // Circle should be on top (newly created shapes have higher zIndex)
        await page.click('[data-tool="select"]');
        await page.click('#canvas', { position: { x: 170, y: 170 } }); // Overlapping area
        
        await expect(page.locator('.property-title')).toContainText('Circle');
    });

    test('layer controls work with different shape types', async ({ page }) => {
        // Draw different types of shapes
        await page.click('[data-tool="line"]');
        await page.click('#canvas', { position: { x: 100, y: 100 } });
        await page.click('#canvas', { position: { x: 200, y: 200 } });
        
        await page.click('[data-tool="circle"]');
        await page.click('#canvas', { position: { x: 120, y: 120 } });
        await page.click('#canvas', { position: { x: 180, y: 180 } });
        
        await page.click('[data-tool="curve"]');
        await page.click('#canvas', { position: { x: 140, y: 140 } });
        await page.click('#canvas', { position: { x: 160, y: 160 } });
        
        // Select the line and bring to front
        await page.click('[data-tool="select"]');
        await page.click('#canvas', { position: { x: 110, y: 110 } });
        
        await expect(page.locator('.property-title')).toContainText('Line');
        await page.click('[data-layer-action="bring-to-front"]');
        
        // Line should now be selectable in the center area
        await page.click('#canvas', { position: { x: 150, y: 150 } });
        await expect(page.locator('.property-title')).toContainText('Line');
    });
});
