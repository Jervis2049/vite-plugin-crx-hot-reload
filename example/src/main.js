import { createApp } from 'vue'
import '@/assets/less/variables.less'
import '@/assets/less/common.less'
import Popup from './popup/index.vue'
const app = createApp(Popup)

app.mount('#app')
