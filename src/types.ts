interface WatchOptions {
  background: string
  content_scripts: string[]
}

export interface Options {
  port?: number
  watch: WatchOptions
  buildEnd?: () => void
}
