import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  build: {
    // Output directory for the build
    outDir: 'build_tmp',
    // Disable emptying output directory to prevent issues with .user.ini files
    emptyOutDir: false,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:6666',
      '/uploads': 'http://127.0.0.1:6666',
    },
  },
})

