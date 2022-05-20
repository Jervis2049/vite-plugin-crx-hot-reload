import http from 'http'
import websocket from 'websocket'
import { basename, resolve } from 'path'
import { readFileSync } from 'fs'

export default function crxHotReloadPlugin(options = {}) {
  let { buildEnd, watch, port } = options
  let { background, content_scripts = [] } = watch

  const PORT = port || 8181
  let socketConnection = null
  let init = true

  const server = http.createServer()
  server.listen(PORT)
  const WebSocketServer = websocket.server
  const wsServer = new WebSocketServer({
    httpServer: server,
  })
  wsServer.on('connect', (connection) => {
    console.log('start ws server at port', connection.socket.localPort)
  })
  wsServer.on('request', function (request) {
    socketConnection = request.accept(null, request.origin)
    socketConnection.on('close', function () {
      console.log('Client has disconnected.')
    })
  })

  const isContentJs = (fileName) => {
    return content_scripts.find((item) => basename(item) === fileName)
  }
  const isBackgroundJs = (fileName) => {
    return basename(background) === fileName
  }

  return {
    name: 'vite-plugin-crx-hot-reload',
    apply: 'build',
    transform(code, id) {
      let fileName = basename(id)
      let data = ''
      if (isBackgroundJs(fileName)) {
        data = readFileSync(resolve(__dirname, './background.js'), 'utf-8')
      }
      if (isContentJs(fileName)) {
        data = `var PORT=${PORT};`
        data += readFileSync(resolve(__dirname, './content.js'), 'utf-8')
      }
      return data + code
    },
    buildEnd: () => {
      if (socketConnection) {
        socketConnection.sendUTF({
          message: 'UPDATE',
        })
      }
      if (init && typeof buildEnd == 'function') {
        buildEnd()
        init = false
      }
    },
  }
}
