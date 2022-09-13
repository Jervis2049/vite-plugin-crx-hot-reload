import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import crxHotReload from 'vite-plugin-crx-hot-reload'
import { resolve } from 'path'

const pathResolve = (p) => {
  return resolve(__dirname, p)
}

export default ({ mode }) => {  
  return defineConfig({
      plugins: [
        vue(),
        crxHotReload({
          input: './src/manifest.json'
        })
      ],
      resolve: {
        alias: {
          '@': pathResolve('./src')
        }
      },
      build: {
        emptyOutDir: mode == 'production',
        rollupOptions: {
          input: {
            popup: './popup.html'
          },
          output: {
            entryFileNames: `js/[name].js`
          }
        }
      },
      css: {
        modules: false,
        preprocessorOptions: {
          less: {
            modifyVars: {
              hack: `true; @import (reference) "${pathResolve(
                './src/assets/less/variables.less'
              )}";`
            },
            javascriptEnabled: true
          }
        }
      }
    })
}

 