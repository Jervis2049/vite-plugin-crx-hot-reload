import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import crxHotReload from 'vite-plugin-crx-hot-reload'
import chokidar from 'chokidar'
import path from 'path'
import { handleCopy, pathResolve } from './utils'

const MANIFEST_PATH = './manifest.json'
const MANIFEST_DEST_PATH = `./dist/manifest.json`
const ICONS_PATH = './src/assets/icons'
const ICONS_DEST_PATH = `./dist/img/icons`

chokidar.watch(MANIFEST_PATH, { ignoreInitial: true }).on('change', (path) => {
  console.log(`File ${path} has been changed`)
  handleCopy([
    {
      src: MANIFEST_PATH,
      dest: MANIFEST_DEST_PATH
    }
  ])
})

chokidar.watch(ICONS_PATH, { ignoreInitial: true }).on('all', (path) => {
  console.log(`File ${path} has been changed`)
  handleCopy([
    {
      src: ICONS_PATH,
      dest: ICONS_DEST_PATH
    }
  ])
})

export default defineConfig({
  plugins: [
    vue(),
    crxHotReload({
      watch: {
        background: './src/js/background.js',
        content_scripts: [
          './src/js/content_scripts/content1.js',
          './src/js/content_scripts/content2.js'
        ]
      },
      buildEnd() {
        handleCopy([
          {
            src: MANIFEST_PATH,
            dest: MANIFEST_DEST_PATH
          },
          {
            src: ICONS_PATH,
            dest: ICONS_DEST_PATH
          }
        ])
      }
    })
  ],
  resolve: {
    alias: {
      '@': pathResolve('./src')
    }
  },
  build: {
    emptyOutDir: false,
    rollupOptions: {
      input: {
        background: './src/js/background.js',
        content1: './src/js/content_scripts/content1.js',
        content2: './src/js/content_scripts/content2.js',
        popup: './popup.html'
      },
      output: {
        entryFileNames: `js/[name].js`,
        assetFileNames: (chunkInfo) => {
          let subDir = 'img'
          if (path.extname(chunkInfo.name) === '.css') {
            subDir = 'css'
          }
          return `${subDir}/[name].[ext]`
        }
        // manualChunks(id) {}
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
