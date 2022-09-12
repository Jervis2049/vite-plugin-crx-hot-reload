import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import crxHotReload from 'vite-plugin-crx-hot-reload'

export default defineConfig({
  build: {
    emptyOutDir: false,
    rollupOptions: {
      input: {
        popup: './popup.html'
      },
      output: {
        entryFileNames: `js/[name].js`
      }
    }
  },
  plugins: [
    react(), 
    crxHotReload({
      input: './src/manifest.json'
    })
  ]
})
