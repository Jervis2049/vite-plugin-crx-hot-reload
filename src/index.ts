import type { Plugin } from 'vite'
import type { Options } from './types'
import http from 'http'
import websocket from 'websocket'
import { basename, resolve } from 'path'
import { readFileSync } from 'fs'

const initOptions = {
  watch: {
    background: '',
    content_scripts: []
  }
}

export default function crxHotReloadPlugin(
  options: Options = initOptions
): Plugin {
  const { buildEnd, watch, port = 8181 } = options
  const { background, content_scripts } = watch

  let socketConnection: any
  let init = true

  const isContentJs = (fileName: string) => {
    return content_scripts.find((item) => basename(item) === fileName)
  }
  const isBackgroundJs = (fileName: string) => {
    return basename(background) === fileName
  }

  return {
    name: 'vite-plugin-crx-hot-reload',
    enforce: 'pre',
    apply(config) {
      return !!config.build?.watch || config.mode == 'development'
    },
    config() {
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
    },
    transform(code, id) {
      const fileName = basename(id)
      let data = ''
      if (isBackgroundJs(fileName)) {
        data = `var PORT=${port};`
        data += readFileSync(resolve(__dirname, './background.js'), 'utf-8')
      }
      if (isContentJs(fileName)) {
        data = `var PORT=${port};`
        data += readFileSync(resolve(__dirname, './content.js'), 'utf-8')
      }
      return data + code
    },
    writeBundle() {
      if (socketConnection) {
        socketConnection.sendUTF({
          message: 'UPDATE'
        })
      }
      if (init && typeof buildEnd == 'function') {
        buildEnd()
        init = false
      }
    }
  }
}
