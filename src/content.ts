const ws = new WebSocket(`ws://localhost:${PORT}`)

ws.onopen = function () {
  console.log('[open] Connection established')
}
ws.onmessage = function (e) {
  console.log('Received Message: ' + e.data)
  if (e.data === 'UPDATE_CONTENT' && chrome.runtime?.id) {
    chrome.runtime.sendMessage({ msg: 'RELOAD' }, () => {
      window.location.reload()
    })
  }
}
ws.onclose = function () {
  console.log('[close] Connection closed.')
}
