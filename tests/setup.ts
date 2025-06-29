/**
 * Test setup file - configures global test environment
 * Loaded via vitest.config.ts setupFiles
 */

// Load polyfills
import './polyfills/broadcastChannel';
import './polyfills/canvas';
import { MockBroadcastChannel } from './polyfills/broadcastChannel';

// Global test utilities
declare global {
  var resetTestEnvironment: () => void;
}

/**
 * Reset global test state between tests
 */
function resetTestEnvironment(): void {
  // Clear all BroadcastChannel instances
  MockBroadcastChannel.clearAll();
  
  // Clear localStorage and sessionStorage
  localStorage.clear();
  sessionStorage.clear();
  
  // Reset any global state that might leak between tests
  if (typeof window !== 'undefined') {
    // Clear any event listeners that might have been added
    window.removeEventListener?.('beforeunload', () => {});
    window.removeEventListener?.('unload', () => {});
  }
}

// Setup global utilities
globalThis.resetTestEnvironment = resetTestEnvironment;

// Auto-reset environment after each test
import { afterEach } from 'vitest';

afterEach(() => {
  resetTestEnvironment();
});

// Mock console methods to reduce noise in test output (optional)
const originalConsole = { ...console };

// Uncomment to silence console during tests:
// console.log = () => {};
// console.warn = () => {};
// console.info = () => {};

// Keep error and debug for important test feedback
// console.error remains active
// console.debug remains active

export { resetTestEnvironment };
