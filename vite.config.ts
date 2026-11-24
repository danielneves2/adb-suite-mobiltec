import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// O Tauri espera a porta fixa 1420 (tauri.conf.json → devUrl).
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: { ignored: ['**/src-tauri/**'] },
  },
})
