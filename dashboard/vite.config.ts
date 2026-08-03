import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      // أثناء التطوير: وجّه طلبات /api لـ wrangler dev
      // شغّل: wrangler pages dev ./dashboard/dist --port 8787
      // أو: npx wrangler dev --port 8787
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      }
    }
  }
})
