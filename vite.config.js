import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectDirectory = fileURLToPath(new URL('.', import.meta.url))

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
    rollupOptions: {
      input: {
        main: resolve(projectDirectory, 'index.html'),
        admin: resolve(projectDirectory, 'admin-lino.html'),
        citizen: resolve(projectDirectory, 'citizen-4.html'),
        login: resolve(projectDirectory, 'login.html'),
      },
    },
  },
})
