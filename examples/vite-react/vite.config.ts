import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import crxHotReload from 'vite-plugin-crx-hot-reload'
import { resolve } from 'path'

const pathResolve = (p) => {
  return resolve(__dirname, p)
}

export default ({mode})=>{
  return defineConfig({
    build: {
      emptyOutDir: mode == 'production'
    },
    resolve: {
        alias: {
          '@': pathResolve('./src')
        }
    },
    plugins: [
      react(), 
      crxHotReload({
        input: './src/manifest.json'
      })
    ]
  })
}