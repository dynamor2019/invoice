import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    // 移除不稳定的 react-compiler Babel 插件，修复 "z is not a function" 运行时错误
    react(),
  ],
  server: {
    port: 6667,
    proxy: {
      '/api': 'http://localhost:6666',
      '/uploads': 'http://localhost:6666',
    },
  },
})
