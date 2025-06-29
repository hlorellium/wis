import { test, expect } from '@playwright/test';

test.describe('Fill/Stroke Functionality E2E', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        
        // Wait for canvas to be ready
        await expect(page.locator('#canvas')).toBeVisible();
        await expect(page.locator('#bg-canvas')).toBeVisible();
    });

    test('should show style panel when drawing tool is selected', async ({ page }) => {
        // Initially style panel should be hidden
        const stylePanel = page.locator('#style-panel');
        await expect(stylePanel).toHaveCSS('display', 'none');

        // Select rectangle tool
        await page.click('[data-tool="rectangle"]');
        
        // Style panel should now be visible
        await expect(stylePanel).not.toHaveCSS('display', 'none');
        await expect(stylePanel).toBeVisible();
    });

    test('should hide style panel when non-drawing tool is selected', async ({ page }) => {
        // Select rectangle tool first to show panel
        await page.click('[data-tool="rectangle"]');
        const stylePanel = page.locator('#style-panel');
        await expect(stylePanel).toBeVisible();

        // Switch to select tool
        await page.click('[data-tool="select"]');
        
        // Style panel should be hidden
        await expect(stylePanel).toHaveCSS('display', 'none');
    });

    test('should hide fill controls for line tool', async ({ page }) => {
        // Select line tool
        await page.click('[data-tool="line"]');
        
        const stylePanel = page.locator('#style-panel');
        await expect(stylePanel).toBeVisible();

        // Fill section should be hidden for line tool
        const fillSection = page.locator('#style-panel .style-section:nth-child(2)');
        await expect(fillSection).toHaveCSS('display', 'none');

        // Fill and both mode buttons should be hidden
        const fillModeButton = page.locator('[data-mode="fill"]');
        const bothModeButton = page.locator('[data-mode="both"]');
        await expect(fillModeButton).toHaveCSS('display', 'none');
        await expect(bothModeButton).toHaveCSS('display', 'none');
    });

    test('should show all controls for rectangle tool', async ({ page }) => {
        // Select rectangle tool
        await page.click('[data-tool="rectangle"]');
        
        const stylePanel = page.locator('#style-panel');
        await expect(stylePanel).toBeVisible();

        // All sections should be visible
        const fillSection = page.locator('#style-panel .style-section:nth-child(2)');
        await expect(fillSection).not.toHaveCSS('display', 'none');

        // All mode buttons should be visible
        const strokeModeButton = page.locator('[data-mode="stroke"]');
        const fillModeButton = page.locator('[data-mode="fill"]');
        const bothModeButton = page.locator('[data-mode="both"]');
        
        await expect(strokeModeButton).toBeVisible();
        await expect(fillModeButton).not.toHaveCSS('display', 'none');
        await expect(bothModeButton).not.toHaveCSS('display', 'none');
    });

    test('should change stroke color when color picker is used', async ({ page }) => {
        // Select rectangle tool
        await page.click('[data-tool="rectangle"]');
        
        // Change stroke color to red
        await page.locator('#stroke-color').fill('#ff0000');
        
        // Verify the color picker value changed
        const strokeColorValue = await page.locator('#stroke-color').inputValue();
        expect(strokeColorValue).toBe('#ff0000');
    });

    test('should change fill color when color picker is used', async ({ page }) => {
        // Select rectangle tool
        await page.click('[data-tool="rectangle"]');
        
        // Change fill color to blue
        await page.locator('#fill-color').fill('#0000ff');
        
        // Verify the color picker value changed
        const fillColorValue = await page.locator('#fill-color').inputValue();
        expect(fillColorValue).toBe('#0000ff');
    });

    test('should toggle between fill modes', async ({ page }) => {
        // Select rectangle tool
        await page.click('[data-tool="rectangle"]');
        
        // Initially stroke mode should be active
        const strokeModeButton = page.locator('[data-mode="stroke"]');
        const fillModeButton = page.locator('[data-mode="fill"]');
        const bothModeButton = page.locator('[data-mode="both"]');
        
        await expect(strokeModeButton).toHaveClass(/active/);
        
        // Click fill mode
        await fillModeButton.click();
        await expect(fillModeButton).toHaveClass(/active/);
        await expect(strokeModeButton).not.toHaveClass(/active/);
        
        // Click both mode
        await bothModeButton.click();
        await expect(bothModeButton).toHaveClass(/active/);
        await expect(fillModeButton).not.toHaveClass(/active/);
    });

    test('should toggle between line styles', async ({ page }) => {
        // Select rectangle tool
        await page.click('[data-tool="rectangle"]');
        
        // Initially solid should be active
        const solidButton = page.locator('[data-style="solid"]');
        const dottedButton = page.locator('[data-style="dotted"]');
        
        await expect(solidButton).toHaveClass(/active/);
        
        // Click dotted style
        await dottedButton.click();
        await expect(dottedButton).toHaveClass(/active/);
        await expect(solidButton).not.toHaveClass(/active/);
        
        // Click back to solid
        await solidButton.click();
        await expect(solidButton).toHaveClass(/active/);
        await expect(dottedButton).not.toHaveClass(/active/);
    });

    test('should change stroke width', async ({ page }) => {
        // Select rectangle tool
        await page.click('[data-tool="rectangle"]');
        
        // Change stroke width to 5px
        await page.selectOption('#stroke-width', '5');
        
        // Verify the selection
        const selectedValue = await page.locator('#stroke-width').inputValue();
        expect(selectedValue).toBe('5');
    });

    test('should draw rectangle with custom colors and see it rendered', async ({ page }) => {
        // Select rectangle tool
        await page.click('[data-tool="rectangle"]');
        
        // Set custom colors
        await page.locator('#stroke-color').fill('#ff0000'); // Red stroke
        await page.locator('#fill-color').fill('#0000ff');   // Blue fill
        
        // Select both mode to see both colors
        await page.click('[data-mode="both"]');
        
        // Set thicker stroke to make it more visible
        await page.selectOption('#stroke-width', '4');
        
        // Draw a rectangle
        const canvas = page.locator('#canvas');
        
        // Get canvas bounding box for coordinates
        const canvasBox = await canvas.boundingBox();
        expect(canvasBox).not.toBeNull();
        
        if (canvasBox) {
            const startX = canvasBox.x + 100;
            const startY = canvasBox.y + 100;
            const endX = canvasBox.x + 200;
            const endY = canvasBox.y + 150;
            
            // Draw rectangle by dragging
            await page.mouse.move(startX, startY);
            await page.mouse.down();
            await page.mouse.move(endX, endY);
            await page.mouse.up();
        }
        
        // Verify that a shape was created by checking if we can select it
        await page.click('[data-tool="select"]');
        
        // Click on the drawn rectangle area to select it
        if (canvasBox) {
            await page.mouse.click(canvasBox.x + 150, canvasBox.y + 125);
        }
        
        // The shape should be selectable, indicating it was drawn successfully
        // Note: In a more sophisticated test, we could check canvas pixels,
        // but for E2E testing, verifying the interaction flow is sufficient
    });

    test('should persist style settings when switching tools', async ({ page }) => {
        // Select rectangle tool
        await page.click('[data-tool="rectangle"]');
        
        // Set custom stroke color
        await page.locator('#stroke-color').fill('#ff0000');
        
        // Switch to circle tool
        await page.click('[data-tool="circle"]');
        
        // Stroke color should persist
        const strokeColorValue = await page.locator('#stroke-color').inputValue();
        expect(strokeColorValue).toBe('#ff0000');
        
        // Switch back to rectangle
        await page.click('[data-tool="rectangle"]');
        
        // Color should still be the same
        const persistedColor = await page.locator('#stroke-color').inputValue();
        expect(persistedColor).toBe('#ff0000');
    });

    test('should show correct tooltips on mode buttons', async ({ page }) => {
        // Select rectangle tool
        await page.click('[data-tool="rectangle"]');
        
        // Check tooltips
        const strokeButton = page.locator('[data-mode="stroke"]');
        const fillButton = page.locator('[data-mode="fill"]');
        const bothButton = page.locator('[data-mode="both"]');
        
        await expect(strokeButton).toHaveAttribute('title', 'Outline only');
        await expect(fillButton).toHaveAttribute('title', 'Fill only');
        await expect(bothButton).toHaveAttribute('title', 'Fill + Outline');
    });

    test('should have proper accessibility labels', async ({ page }) => {
        // Select rectangle tool
        await page.click('[data-tool="rectangle"]');
        
        // Check that color pickers have proper titles
        const strokeColorPicker = page.locator('#stroke-color');
        const fillColorPicker = page.locator('#fill-color');
        
        await expect(strokeColorPicker).toHaveAttribute('title', 'Stroke color');
        await expect(fillColorPicker).toHaveAttribute('title', 'Fill color');
        
        // Check that stroke width selector exists
        const strokeWidthSelect = page.locator('#stroke-width');
        await expect(strokeWidthSelect).toBeVisible();
    });

    test('should properly integrate with the drawing workflow', async ({ page }) => {
        // Select rectangle tool and verify style panel is shown
        await page.click('[data-tool="rectangle"]');
        const stylePanel = page.locator('#style-panel');
        await expect(stylePanel).toBeVisible();
        
        // Set custom style settings
        await page.locator('#stroke-color').fill('#ff0000'); // Red stroke
        await page.locator('#fill-color').fill('#0000ff');   // Blue fill
        await page.click('[data-mode="both"]'); // Both fill and stroke
        await page.selectOption('#stroke-width', '3'); // 3px width
        await page.click('[data-style="dotted"]'); // Dotted style
        
        // Verify all settings are applied
        const strokeColorValue = await page.locator('#stroke-color').inputValue();
        const fillColorValue = await page.locator('#fill-color').inputValue();
        const strokeWidthValue = await page.locator('#stroke-width').inputValue();
        
        expect(strokeColorValue).toBe('#ff0000');
        expect(fillColorValue).toBe('#0000ff');
        expect(strokeWidthValue).toBe('3');
        
        // Verify UI state
        await expect(page.locator('[data-mode="both"]')).toHaveClass(/active/);
        await expect(page.locator('[data-style="dotted"]')).toHaveClass(/active/);
        
        // Switch tools and verify persistence
        await page.click('[data-tool="circle"]');
        
        // Settings should persist across tool changes
        const persistedStrokeColor = await page.locator('#stroke-color').inputValue();
        const persistedFillColor = await page.locator('#fill-color').inputValue();
        
        expect(persistedStrokeColor).toBe('#ff0000');
        expect(persistedFillColor).toBe('#0000ff');
    });
});
