<template>
  <div>
    <div @click="log" class="container">{{ msg }}</div>
  </div>
</template>

<script setup>
const msg = 'Hello World!'

function log() {
  console.log(msg)
}
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
