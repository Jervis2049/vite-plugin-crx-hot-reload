import type { Plugin, ResolvedConfig } from 'vite'
import { WebSocketServer } from 'ws'
import { resolve, dirname, extname, basename } from 'path'
import { readFileSync } from 'fs'
import { normalizePath } from './utils'
import { ManifestProcessor } from './processors/manifest'

interface Options {
  port?: number
  input: string
}

export default function crxHotReloadPlugin(
  options: Partial<Options> = {}
): Plugin {
  const { port = 8181, input = '' } = options
  if (
    !input ||
    typeof input != 'string' ||
    (typeof input == 'string' && !input.endsWith('manifest.json'))
  ) {
    throw new Error(
      "The input parameter is required and the value must be the path to the chrome extension's manifest.json."
    )
  }

  const srcDir = dirname(input)  
  let socket: any
  let serviceWorkerPath: string | undefined
  let contentScriptPaths: string[] = []
  let manifestFullPath: string | undefined
  let assetPaths: string[] = []
  let cssPaths: string[] = []
  let htmlPaths : string[] = []
  let changedFilePath: string
  let manifestProcessor

  function takeManifestScriptsAsInput(config) {
    let rollupOptionsInput = config.build.rollupOptions.input
    const  manifestAssetPaths =  manifestProcessor.getAssetPaths()
    contentScriptPaths = manifestAssetPaths.contentScriptPaths
    assetPaths = manifestAssetPaths.assetPaths
    cssPaths = manifestAssetPaths.cssPaths
    serviceWorkerPath = manifestAssetPaths.serviceWorkerPath
    htmlPaths = manifestAssetPaths.htmlPaths
    
    if (Array.isArray(rollupOptionsInput)) {
      config.build.rollupOptions.input = [...rollupOptionsInput, ...htmlPaths, ...contentScriptPaths, serviceWorkerPath]
    } else if (typeof rollupOptionsInput === 'object') {
      const entryRet = {}
      const setEntry = (item)=>{
        const name = basename(item, extname(item))
        entryRet[name] = item
      }
      if(serviceWorkerPath) {
        setEntry(serviceWorkerPath)
      }
      [...htmlPaths, ...contentScriptPaths].forEach((item) => {
        setEntry(item)
      })
      config.build.rollupOptions.input = {
        ...rollupOptionsInput,
        ...entryRet
      }
    }
  }

  function handleBuildPath(config) {
    if (!config.build.rollupOptions.output) {
      config.build.rollupOptions.output = {}
    }
    const entryFileNames = config.build.rollupOptions.output.entryFileNames
    config.build.rollupOptions.output.entryFileNames = (assetInfo) => {      
      if (
        assetInfo.facadeModuleId &&
        /.(j|t)s$/.test(assetInfo.facadeModuleId)
      ) {
        let srcFullPath = resolve(srcDir)
        const assetPath = dirname(assetInfo.facadeModuleId).replace(
          normalizePath(srcFullPath),
          ''
        )
        return `${assetPath ? assetPath.slice(1) + '/' : ''}[name].js`
      }
      if (entryFileNames) {
        if (typeof entryFileNames == 'string') {
          return entryFileNames
        } else if (typeof entryFileNames == 'function') {
          return entryFileNames(assetInfo)
        }
      }
      return 'assets/js/[name]-[hash].js'
    }
  }

  function startWebsocket(config) {
    if (config.mode === 'production') return
    const wss = new WebSocketServer({ port })
    wss.on('connection', function connection(ws) {
      console.log('[webSocket] Client connected.')
      ws.on('close', () => console.log('[webSocket] Client disconnected.'))
      socket = ws
    })
  }

  return {
    name: 'vite-plugin-crx-hot-reload',
    enforce: 'pre',
    configResolved(config: ResolvedConfig) {
      manifestProcessor = new ManifestProcessor({
        input,
        port,
        viteConfig: config
      })
      manifestFullPath = normalizePath(resolve(config.root, input))
      // Add background.js and content_scripts as part of rollupOptions.input
      takeManifestScriptsAsInput(config)
      // Rewrite output.entryFileNames to modify build path of assets.
      handleBuildPath(config)
      // Open socket service
      startWebsocket(config)
    },
    watchChange(id) {
      changedFilePath = normalizePath(id)
    },
    transform(code, id) {      
      let data = ''
      if (serviceWorkerPath === id) {
        data = `var PORT=${port};`
        data += readFileSync(resolve(__dirname, 'background.js'), 'utf-8')
      }
      return data + code
    },
    buildStart() {
      manifestProcessor.emitManifest(this)
      manifestProcessor.emitAssets(this, assetPaths)
      manifestProcessor.emitContentScriptDev(this)
    },
    writeBundle() {
      if (socket) {
        if (
          contentScriptPaths.includes(changedFilePath) ||
          cssPaths.includes(changedFilePath) ||
          manifestFullPath === changedFilePath
        ) {
          socket.send('UPDATE_CONTENT')
        }
        if (
          serviceWorkerPath === changedFilePath ||
          manifestFullPath === changedFilePath
        ) {
          socket.send('UPDATE_SERVICE_WORK')
        }
        console.log(`File change detected : ${changedFilePath}`)
      }
    }
  }
}
