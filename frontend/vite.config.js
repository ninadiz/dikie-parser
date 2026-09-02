import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const PHP_BACKEND = 'http://127.0.0.1:8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // TZ project layout puts the built bundle at repo root (dist/), a sibling of frontend/,
    // not nested inside frontend/ — hosting has no Node.js, so this is the only build artifact deployed.
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    host: '127.0.0.1',
    proxy: {
      '/api': PHP_BACKEND,
      '/fetch.php': PHP_BACKEND,
    },
  },
})
