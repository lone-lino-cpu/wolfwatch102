import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: true,
  },
  preview: {
    host: true,
    allowedHosts: ['wolfwatch102.onrender.com'],
  },
  build: {
    outDir: 'dist',
  },
})
