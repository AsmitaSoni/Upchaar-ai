import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        // Handle multipart form data properly
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            // Don't modify content-type for multipart (file uploads)
            if (req.headers['content-type']?.includes('multipart/form-data')) {
              return;
            }
          });
        },
      },
      '/chat': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
