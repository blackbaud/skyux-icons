import { defineConfig } from 'vite';

export default defineConfig(() => ({
  test: {
    watch: false,
    globals: true,
    include: [
      '{src,tests,module,scripts}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    reporters: ['default'],
    coverage: {
      reportsDirectory: './coverage/skyux-icons',
      provider: 'v8' as const,
      reporter: ['text', 'json', 'html', 'lcov'],
      all: true,
      enabled: true,
      exclude: [
        'dist',
        '{src,tests,module,scripts}/**/*.test.{js,ts}',
        '{src,tests,module,scripts}/**/index.ts',
      ],
      include: [
        '{src,tests,module,scripts}/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      ],
      thresholds: {
        lines: 98,
        functions: 100,
        branches: 100,
        statements: 98,
        'module/*': {
          lines: 72,
          functions: 100,
          branches: 100,
          statements: 72,
        },
        'scripts/*': {
          lines: 100,
          functions: 100,
          branches: 100,
          statements: 100,
        },
      },
    },
  },
}));
