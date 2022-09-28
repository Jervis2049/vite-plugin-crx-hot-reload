import type { Plugin, ResolvedConfig } from 'vite'
import type { ChromeExtensionManifest, ContentScript } from './manifest'
import { WebSocketServer } from 'ws'
import { resolve, dirname, extname, basename, normalize } from 'path'
import { readFileSync } from 'fs'
import { isJsonString, normalizePath } from './utils'

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
  let scriptPaths: string[] = []
  let backgroundScript: string | undefined
  let contentScripts: string[] = []
  let manifestFullPath: string | undefined
  let assetPaths: string[] = []
  let changedFilePath: string
  let manifestRaw: string

  function handleManifest(config) {
    let rollupOptionsInput = config.build.rollupOptions.input
    manifestFullPath = normalizePath(resolve(config.root, input))
    manifestRaw = readFileSync(manifestFullPath, 'utf-8')
    if (!isJsonString(manifestRaw)) {
      throw new Error('The manifest.json is not valid.')
    }
    let manifestContent: ChromeExtensionManifest = JSON.parse(manifestRaw)
    let serviceWorker = manifestContent?.background?.service_worker
    if (serviceWorker) {
      backgroundScript = normalizePath(resolve(srcDir, serviceWorker))
      scriptPaths.push(backgroundScript)
    }
    if (manifestContent.icons) {
      const icons = Object.keys(manifestContent.icons)
      if (Array.isArray(icons)) {
        let iconPaths = icons.map((key) => {
          return manifestContent.icons?.[key]
        })
        assetPaths = [...assetPaths, ...iconPaths]
      }
    }
    if (Array.isArray(manifestContent.content_scripts)) {
      manifestContent.content_scripts.forEach((item: ContentScript) => {
        if (Array.isArray(item.js)) {
          let contentScriptFullPaths = item.js.map((path) =>
            normalizePath(resolve(srcDir, path))
          )
          scriptPaths = [...scriptPaths, ...contentScriptFullPaths]
          contentScripts = [...contentScripts, ...contentScriptFullPaths]
        }
        if (Array.isArray(item.css)) {
          assetPaths = [...assetPaths, ...item.css]
        }
      })
    }

    // Add background.js and content_scripts as part of rollupOptions.input
    if (Array.isArray(rollupOptionsInput)) {
      config.build.rollupOptions.input = [...rollupOptionsInput, ...scriptPaths]
    } else if (typeof rollupOptionsInput === 'object') {
      const entryRet = {}
      scriptPaths.forEach((item) => {
        const name = basename(item, extname(item))
        entryRet[name] = item
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
    if (config?.mode == 'production' || process.env.NODE_ENV == 'production') {
      return
    }
    const wss = new WebSocketServer({ port })
    wss.on('connection', function connection(ws) {
      console.log('start ws server at port', port)
      socket = ws
    })
    wss.on('close', function close() {
      console.log('Client has disconnected.')
    })
  }

  return {
    name: 'vite-plugin-crx-hot-reload',
    enforce: 'pre',
    configResolved(config: ResolvedConfig) {
      //Parse manifest.json
      handleManifest(config)

      //Rewrite output.entryFileNames to modify build path of assets.
      handleBuildPath(config)

      // Open socket service
      startWebsocket(config)
    },
    watchChange(id) {
      changedFilePath = normalizePath(id)
    },
    transform(code, id) {
      let data = ''
      if (backgroundScript === id) {
        data = `var PORT=${port};`
        data += readFileSync(resolve(__dirname, './background.js'), 'utf-8')
      }
      if (contentScripts.includes(id)) {
        data = `var PORT=${port};`
        data += readFileSync(resolve(__dirname, './content.js'), 'utf-8')
      }
      return data + code
    },
    buildStart() {
      //generate icon/css files
      assetPaths.forEach((path) => {
        const assetPath = resolve(srcDir, path)
        this.addWatchFile(assetPath)
        let content = readFileSync(assetPath)
        this.emitFile({
          type: 'asset',
          source: content,
          fileName: normalize(path)
        })
      })
      //generate manifest.json
      if (manifestFullPath) {
        let manifestRaw = readFileSync(manifestFullPath, 'utf-8')
        let manifestSource = manifestRaw.replaceAll('.ts', '.js')
        this.addWatchFile(manifestFullPath)
        this.emitFile({
          type: 'asset',
          source: manifestSource,
          fileName: 'manifest.json'
        })
      }
    },
    writeBundle() {
      if (socket) {
        if (contentScripts.includes(changedFilePath) || manifestFullPath === changedFilePath) {
          socket.send('UPDATE_CONTENT')
        }
        if (backgroundScript === changedFilePath || manifestFullPath === changedFilePath) {
          socket.send('UPDATE_SERVICE_WORK')
        }
        console.log(`File change detected : ${changedFilePath}`)
      }
    }
  }
}
