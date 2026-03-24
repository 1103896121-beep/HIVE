import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true, // 如果端口被占用则报错，而不是自动切换
    host: true,       // 监听所有网络接口，方便排除 localhost 解析问题
    proxy: {
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
      '/': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        // 由于前端自身也是在根目录服务，我们需要排除前端资源的拦截 (比如 html/js/css)
        // 更优雅的做法是后端统一有个 /api 前缀，但为了最小化修改，我们这里采用 bypass
        bypass: function (req) {
          if (req.headers.accept?.includes('html') || req.url?.startsWith('/src') || req.url?.startsWith('/node_modules') || req.url?.startsWith('/@')) {
            return req.url;
          }
        }
      }
    }
  }
})
