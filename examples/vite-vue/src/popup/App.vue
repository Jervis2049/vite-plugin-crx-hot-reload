<template>
  <div class="container">
    <a :href="optionsPageUrl" target="_blank">Open the options page</a>
  </div>
</template>

<script setup>
const optionsPageUrl = `chrome-extension://${chrome.runtime.id}/options.html`
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
