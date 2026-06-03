import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      external: ['@tauri-apps/api/tauri', '@tauri-apps/api'],
      output: {
        globals: {
          '@tauri-apps/api': 'window.__TAURI__',
          '@tauri-apps/api/tauri': 'window.__TAURI__.invoke'
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ['@tauri-apps/api']
  }
})
