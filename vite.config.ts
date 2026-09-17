import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon-32.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'GPS DAS RIMAS',
        short_name: 'GPS Rimas',
        description: 'O mapa nacional das batalhas de rima.',
        theme_color: '#0a0a0c',
        background_color: '#0a0a0c',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'pt-BR',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webp}'],
        // icon-512 e og-image só são usados na instalação do PWA / preview
        // em redes sociais — não vale a pena baixar isso tudo de cara no
        // primeiro acesso, então ficam de fora do precache automático.
        globIgnores: ['**/icon-512.png', '**/og-image.png'],
        // Tiles de mapa e chamadas de API não devem ser pré-cacheadas no build;
        // ficam de fora do precache do app shell.
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
})
