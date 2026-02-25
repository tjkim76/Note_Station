import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import mkcert from 'vite-plugin-mkcert'
import { VitePWA } from 'vite-plugin-pwa'
import progress from 'vite-plugin-progress'

// 프로세스 명칭 설정
process.title = 'note-station-web';
console.log(`Vite PID: ${process.pid}`);

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

const proxyConfig = {
  '/api': {
    target: 'http://localhost:4000',
    changeOrigin: true,
    secure: false
  },
  '/uploads': {
    target: 'http://localhost:4000',
    changeOrigin: true,
    secure: false
  }
}

export default defineConfig(({ mode }) => ({
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  plugins: [
    progress(),
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
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
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
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: 'index.html',
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // https: false, // mkcert 플러그인 사용 시 https 설정이 자동으로 처리되도록 주석 처리 또는 제거
    host: true,
    proxy: proxyConfig
  },
  preview: {
    port: 3000,
    host: true,
    proxy: proxyConfig
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['lucide-react']
        }
      }
    }
  }
}))