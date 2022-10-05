<template>
  <div class="container">
    <button id="btn">executeScript</button>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
onMounted(() => {
  let oBtn = document.getElementById('btn')
  oBtn.addEventListener('click', async () => {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['js/content_scripts/content3.ts']
    })
  })
})
</script>

<style lang="less" scoped>
.container {
  width: 300px;
  height: 100px;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
