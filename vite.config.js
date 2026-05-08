import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/MacroForge/',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React runtime — cached separately from all app code
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor';
          }
          // Catalog data — cached independently from UI code.
          // Products/images/catalog change on inventory updates;
          // UI components change on feature releases. Separate caches = fewer re-downloads.
          if (
            id.includes('/data/products') ||
            id.includes('/data/images')   ||
            id.includes('/data/catalog')
          ) {
            return 'catalog-data';
          }
        },
      },
    },
  },
})
