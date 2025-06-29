import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['tests/setup.ts'],
    coverage: { 
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80
      },
      exclude: [
        'coverage/**',
        'dist/**',
        '**/node_modules/**',
        '**/[.]**',
        'packages/*/test?(s)/**',
        '**/*.d.ts',
        'src/main.ts',           // App initialization
        'src/view.ts',           // Legacy file
        'src/counter.ts',        // Demo file
        'src/vite-env.d.ts',     // Type definitions
        'vitest.config.ts'
      ]
    }
  }
});
