const ws = new WebSocket(`ws://localhost:${PORT}`)

ws.onopen = function () {
  console.log('Connection open ...')
}
ws.onmessage = function (e) {
  console.log('Received Message: ' + e.data)
  if (chrome.runtime?.id) {
    chrome.runtime.sendMessage({ msg: 'RELOAD' }, () => {
      window.location.reload()
    })
  }
}
ws.onclose = function () {
  console.log('Connection closed.')
}
