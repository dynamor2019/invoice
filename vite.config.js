import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const API_TARGET = process.env.VITE_API_TARGET || 'http://127.0.0.1:3002'

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
    port: 8080,
    host: '127.0.0.1',
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: API_TARGET,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})

