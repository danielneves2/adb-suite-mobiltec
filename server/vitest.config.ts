import { defineConfig } from 'vitest/config'

// A API tem configuração própria (senão o vitest usa a do app na pasta de cima).
export default defineConfig({
  test: { include: ['lib/**/*.test.ts'] },
})
