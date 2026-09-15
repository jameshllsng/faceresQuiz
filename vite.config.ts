import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'FACERES Quiz',
        short_name: 'FACERES Quiz',
        description: 'Quiz de gincana da FACERES para uso em sala.',
        lang: 'pt-BR',
        theme_color: '#c51d37',
        background_color: '#fff8f5',
        display: 'fullscreen',
        start_url: '/',
        icons: [
          {
            src: 'faceres-quiz-icon.svg',
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
