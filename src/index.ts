import type { Plugin, ResolvedConfig } from 'vite'
import type { ChromeExtensionManifest, ContentScript } from './manifest'
import http from 'http'
import websocket from 'websocket'
import { resolve, dirname, join } from 'path'
import { readFileSync } from 'fs'
import { isJsonString } from './utils'

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

  let socketConnection: any
  let backgroundJs: string | undefined
  let contentJs: string[] = []
  let iconsPath: any[] = []
  let manifestFilePath: string | undefined
  const srcDir = dirname(input)
  let manifestAssets: string[] = []
  let globalConfig: ResolvedConfig

  function isProduction() {
    return (
      globalConfig?.mode == 'production' || process.env.NODE_ENV == 'production'
    )
  }

  function handleScripts(path, originBuffer) {
    if (isProduction()) {
      return originBuffer
    } else {
      const initBuffer = Buffer.from(`var PORT=${port};`)
      let injectCodeBuffer
      const isBackgroundJs = path === backgroundJs
      const isContentJs = contentJs.includes(path)
      if (isBackgroundJs || isContentJs) {
        if (isBackgroundJs) {
          injectCodeBuffer = readFileSync(resolve(__dirname, './background.js'))
        }
        if (isContentJs) {
          injectCodeBuffer = readFileSync(resolve(__dirname, './content.js'))
        }
        return Buffer.concat([initBuffer, injectCodeBuffer, originBuffer])
      } else {
        return originBuffer
      }
    }
  }

  function startWebsocket() {
    if (isProduction()) return
    const server = http.createServer()
    server.listen(port)
    const WebSocketServer = websocket.server
    const wsServer = new WebSocketServer({
      httpServer: server
    })
    wsServer.on('connect', (connection) => {
      console.log('start ws server at port', connection.socket.localPort)
    })
    wsServer.on('request', (request) => {
      socketConnection = request.accept(null, request.origin)
      socketConnection.on('close', () => {
        console.log('Client has disconnected.')
      })
    })
  }

  return {
    name: 'vite-plugin-crx-hot-reload',
    enforce: 'pre',
    configResolved(config: ResolvedConfig) {
      globalConfig = config
      manifestFilePath = resolve(config.root, input)
      const manifestRaw: string = readFileSync(manifestFilePath, 'utf-8')
      if (!isJsonString(manifestRaw)) {
        throw new Error('The manifest.json is not valid.')
      }
      const manifestContent: ChromeExtensionManifest = JSON.parse(manifestRaw)
      backgroundJs = manifestContent?.background?.service_worker
      if (backgroundJs) manifestAssets.push(backgroundJs)
      if (manifestContent.icons) {
        const icons = Object.keys(manifestContent.icons)
        if (Array.isArray(icons)) {
          iconsPath = icons.map((key) => {
            return manifestContent.icons?.[key]
          })
          manifestAssets = [...manifestAssets, ...iconsPath]
        }
      }
      if (manifestContent.content_scripts) {
        manifestContent.content_scripts.forEach((item: ContentScript) => {
          if (item.js) {
            manifestAssets = [...manifestAssets, ...item.js]
            contentJs = [...contentJs, ...item.js]
          }
        })
      }
      startWebsocket()
    },
    buildStart() {
      manifestAssets.forEach((path) => {
        const assetPath = join(srcDir, path)
        this.addWatchFile(assetPath)
        let content = readFileSync(assetPath)
        //inject code
        content = handleScripts(path, content)
        //generate files
        this.emitFile({
          type: 'asset',
          source: content,
          fileName: path
        })
      })
      if (manifestFilePath) {
        this.addWatchFile(manifestFilePath)
        const manifestContent = readFileSync(manifestFilePath)
        this.emitFile({
          type: 'asset',
          source: manifestContent,
          fileName: 'manifest.json'
        })
      }
    },
    writeBundle() {
      if (socketConnection) {
        socketConnection.sendUTF({
          message: 'UPDATE'
        })
      }
    }
  }
}
