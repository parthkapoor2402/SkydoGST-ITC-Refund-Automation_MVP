import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'src/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'json-summary'],
      reportsDirectory: './coverage',
      include: [
        'src/modules/firaParser.ts',
        'src/modules/invoiceParser.ts',
        'src/modules/matchingEngine.ts',
        'src/modules/rfd01Generator.ts',
        'src/modules/zipPackager.ts',
      ],
    },
  },
})
