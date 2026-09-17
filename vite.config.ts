import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { distributionConfig } from './src/distributions/faceres/config.ts'

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: distributionConfig.productName,
        short_name: distributionConfig.productName,
        description: distributionConfig.pwa.description,
        lang: 'pt-BR',
        theme_color: distributionConfig.theme.primary,
        background_color: '#fff8f5',
        display: 'fullscreen',
        start_url: '/',
        icons: [
          {
            src: distributionConfig.pwa.icon,
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg}'],
      },
    }),
  ],
})
