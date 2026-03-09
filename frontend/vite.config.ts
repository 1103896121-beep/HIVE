import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true, // 如果端口被占用则报错，而不是自动切换
    host: true       // 监听所有网络接口，方便排除 localhost 解析问题
  }
})
