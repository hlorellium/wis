import { test, expect } from '@playwright/test';
import { drawRectangle } from './utils';

test.describe('Property Inspector Debug', () => {
    test('debug property inspector visibility', async ({ page }) => {
        await page.goto('/');
        await page.waitForSelector('#canvas', { state: 'visible' });
        await page.waitForTimeout(500);

        // Log what elements are present
        const propertyInspector = await page.locator('#property-inspector');
        console.log('Property inspector exists:', await propertyInspector.count());
        
        // Check initial state
        const isVisible = await propertyInspector.isVisible();
        console.log('Property inspector initially visible:', isVisible);

        // Draw a rectangle
        await page.click('[data-tool="rectangle"]');
        await drawRectangle(page, 100, 100, 200, 200);
        
        // Check if any shapes were created
        const shapesCount = await page.evaluate(() => {
            // @ts-ignore
            return window.app?.debugState?.scene?.shapes?.length || 0;
        });
        console.log('Shapes count after drawing:', shapesCount);

        // Switch to select tool
        await page.click('[data-tool="select"]');
        
        // Try to select the rectangle
        await page.click('#canvas', { position: { x: 150, y: 150 } });
        
        // Check selection
        const selection = await page.evaluate(() => {
            // @ts-ignore
            return window.app?.debugState?.selection || [];
        });
        console.log('Selection after click:', selection);

        // Wait a bit for property inspector to update
        await page.waitForTimeout(1000);
        
        // Check if property inspector is now visible
        const isVisibleAfterSelection = await propertyInspector.isVisible();
        console.log('Property inspector visible after selection:', isVisibleAfterSelection);

        // Check if the content was generated
        const content = await propertyInspector.innerHTML();
        console.log('Property inspector content length:', content.length);

        // Manually check if layer controls exist
        const layerControls = await page.locator('.property-layer-controls');
        console.log('Layer controls count:', await layerControls.count());
    });
});
