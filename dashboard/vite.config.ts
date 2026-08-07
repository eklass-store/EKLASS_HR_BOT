import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true
      },
      manifest: {
        name: 'EKLASS HR Dashboard',
        short_name: 'EKLASS HR',
        description: 'لوحة تحكم نظام إدارة الموارد البشرية EKLASS HR',
        theme_color: '#2563eb',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
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
