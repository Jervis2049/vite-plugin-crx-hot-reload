const ws = new WebSocket(`ws://localhost:${PORT}`)
ws.addEventListener('message', () => {
  chrome.runtime.reload()
  chrome.tabs.reload()
})

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.msg == 'RELOAD') {
    chrome.runtime.reload()
    chrome.tabs.reload()
    sendResponse()
  }
})
