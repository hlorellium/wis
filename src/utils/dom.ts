/**
 * Utility functions for safe DOM operations
 */

/**
 * Safely query for a required DOM element with type checking
 */
export function getRequiredElement<T extends Element>(
  selector: string,
  container: Document | Element = document
): T {
  const element = container.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Required element not found: ${selector}`);
  }
  return element;
}

/**
 * Safely query for an optional DOM element with type checking
 */
export function getOptionalElement<T extends Element>(
  selector: string,
  container: Document | Element = document
): T | null {
  return container.querySelector<T>(selector);
}

/**
 * Safely query for multiple DOM elements with type checking
 */
export function getElements<T extends Element>(
  selector: string,
  container: Document | Element = document
): NodeListOf<T> {
  return container.querySelectorAll<T>(selector);
}

/**
 * Check if an element exists
 */
export function elementExists(
  selector: string,
  container: Document | Element = document
): boolean {
  return container.querySelector(selector) !== null;
}
