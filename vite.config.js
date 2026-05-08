import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/MacroForge/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React vendor — cached separately from app logic
          'react-vendor': ['react', 'react-dom'],
        },
      },
    },
  },
})
