import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3377,
    host: '0.0.0.0'
  },
  preview: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: [
      'hubble.blockonauts.io',
      'localhost',
      '127.0.0.1'
    ]
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})