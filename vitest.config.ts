import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Testes de componente (*.test.tsx) começam com `// @vitest-environment jsdom`.
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'scripts/**/*.test.mjs'],
    setupFiles: ['./src/test-setup.ts'],
  },
})
