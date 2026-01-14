/// <reference types="vitest" />

import legacy from '@vitejs/plugin-legacy'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    legacy()
  ],
  base: './',
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Eliminar console.log en producción
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router', 'react-router-dom'],
          'vendor-ionic': ['@ionic/react', '@ionic/react-router', 'ionicons'],
          'vendor-capacitor': ['@capacitor/core', '@capacitor/app'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
  }
})
