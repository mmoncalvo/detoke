import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    // Pages under src/pages/dev (like /dev/logo) are for development: the production build gets an empty component.
    { name: 'dev-only-pages', apply: 'build', load: (id: string) => (id.includes('/src/pages/dev/') ? 'export default function DevOnly() { return null; }' : null) },
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: { '@': path.resolve(root, 'src'), '@shared': path.resolve(root, 'shared') },
    dedupe: ['react', 'react-dom'],
  },
  server: { watch: { ignored: ['**/data/**', '**/venv/**', '**/database.sqlite*'] } },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-dom/client', 'react-router-dom'],
          ui: ['radix-ui', 'cmdk', 'sonner'],
          forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
          map: ['leaflet', 'react-leaflet'],
        },
      },
    },
  },
})
