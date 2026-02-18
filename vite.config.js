import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mkcert from 'vite-plugin-mkcert'
import { VitePWA } from 'vite-plugin-pwa'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function ensurePwaAssets() {
  return {
    name: 'ensure-pwa-assets',
    buildStart() {
      const dest = path.resolve(__dirname, 'public');
      if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
      
      const assets = [
        { name: 'favicon.ico', content: 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7' }, // 1x1 GIF
        { name: 'pwa-192x192.png', content: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg==' }, // 1x1 PNG
        { name: 'pwa-512x512.png', content: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg==' }  // 1x1 PNG
      ];

      assets.forEach(asset => {
        const assetPath = path.join(dest, asset.name);
        if (!fs.existsSync(assetPath)) {
          fs.writeFileSync(assetPath, Buffer.from(asset.content, 'base64'));
        }
      });
    }
  }
}

export default defineConfig({
  plugins: [
    react(), 
    ensurePwaAssets(), 
    mkcert(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'pwa-192x192.png', 'pwa-512x512.png'],
      manifest: {
        name: 'Note Station',
        short_name: 'NoteStation',
        description: 'Evernote-style note taking station',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  base: './',
  server: {
    https: false,
    host: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
})