const ws = new WebSocket(`ws://localhost:${PORT}`)
ws.addEventListener('message', () => {
  if (chrome.runtime?.id) {
    chrome.runtime.sendMessage({ msg: 'RELOAD' }, () => {
      window.location.reload()
    })
  }
})
