import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
          react: ['react', 'react-dom', 'react-router-dom'],
          ui: ['radix-ui', 'cmdk', 'sonner'],
          forms: ['react-hook-form', '@hookform/resolvers', 'zod'],
          map: ['leaflet', 'react-leaflet'],
        },
      },
    },
  },
})
