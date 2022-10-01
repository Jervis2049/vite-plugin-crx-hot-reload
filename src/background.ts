const ws = new WebSocket(`ws://localhost:${PORT}`)

ws.onopen = function () {
  console.log('[open] Connection established')
}
ws.onmessage = function (e) {
  console.log('Received Message: ' + e.data)
  if (e.data === 'UPDATE_SERVICE_WORK' && chrome.runtime?.id) {
    chrome.runtime.reload()
    chrome.tabs.reload()
  }
}
ws.onclose = function () {
  console.log('[close] Connection closed.')
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.msg == 'RELOAD') {
    chrome.runtime.reload()
    chrome.tabs.reload()
    sendResponse()
  }
})
