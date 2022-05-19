let timer = null
const ws = new WebSocket(`ws://localhost:${PORT}`)
ws.addEventListener('message', (event) => {
  console.log('event', event)
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    if (chrome.runtime?.id) {
      chrome.runtime.sendMessage({ msg: 'RELOAD' }, () => {
        window.location.reload()
      })
    }
  }, 200)
})
