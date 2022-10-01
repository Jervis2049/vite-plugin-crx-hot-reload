import { resolve, dirname, normalize } from 'path'
import { readFileSync } from 'fs'
import less from 'less'
import { isJsonString, normalizePath, replaceExtname } from '../utils'
import type { ChromeExtensionManifest, ContentScript } from '../manifest'

export class ManifestProcessor {
  constructor(options = {}) {
    this.options = options
    this.contentScriptDevPath = 'js/content_scripts/content-dev.js'
  }

  public readManifest() {
    let { input, viteConfig } = this.options
    let manifestFullPath = normalizePath(resolve(viteConfig.root, input!))
    let manifestRaw = readFileSync(manifestFullPath, 'utf-8')
    if (!isJsonString(manifestRaw)) {
      throw new Error('The manifest.json is not valid.')
    }
    let manifestContent = JSON.parse(manifestRaw)
    return manifestContent
  }

  public emitManifest(context) {
    let { input, viteConfig } = this.options
    let manifestFullPath = normalizePath(resolve(viteConfig.root, input!))
    //generate manifest.json
    if (manifestFullPath) {
      let manifestContent = this.readManifest()
      let serviceWorker = manifestContent?.background?.service_worker
      if (serviceWorker) {
        manifestContent.background.service_worker = replaceExtname(
          serviceWorker,
          '.ts',
          '.js'
        )
      }
      if (Array.isArray(manifestContent.content_scripts)) {
        manifestContent.content_scripts.forEach((item: ContentScript) => {
          if (Array.isArray(item.js)) {
            item.js = item.js.map((item) => replaceExtname(item, '.ts', '.js'))
          }
          if (Array.isArray(item.css)) {
            item.css = item.css.map((item) =>
              replaceExtname(item, '.less', '.css')
            )
          }
        })
        if (viteConfig.mode !== 'production') {
          manifestContent.content_scripts = [
            ...manifestContent.content_scripts,
            {
              matches: ['<all_urls>'],
              js: ['js/content_scripts/content-dev.js'],
              run_at: 'document_start'
            }
          ]
        }
      }
      context.addWatchFile(manifestFullPath)
      context.emitFile({
        type: 'asset',
        source: JSON.stringify(manifestContent),
        fileName: 'manifest.json'
      })
    }
  }
  // generate a contentScript for dev
  public emitContentScriptDev(context) {
    let { viteConfig } = this.options
    if (viteConfig.mode === 'production') return
    let { port } = this.options
    let contentScriptsDevCode = `var PORT=${port};`
    contentScriptsDevCode += readFileSync(
      resolve(__dirname, 'content.js'),
      'utf-8'
    )
    context.emitFile({
      type: 'asset',
      source: contentScriptsDevCode,
      fileName: this.contentScriptDevPath
    })
  }
  // icon | css
  public emitAssets(context, paths) {
    let { input } = this.options
    const srcDir = dirname(input!)
    paths.forEach((item) => {
      const assetPath = resolve(srcDir, item)
      context.addWatchFile(assetPath)
      if (assetPath.endsWith('.less')) {
        less
          .render(readFileSync(assetPath, 'utf-8'), {
            compress: false
          })
          .then(
            (output) => {
              context.emitFile({
                type: 'asset',
                source: output.css,
                fileName: replaceExtname(normalize(item), '.less', '.css')
              })
            },
            (error) => {
              console.log(error)
            }
          )
      } else {
        let content = readFileSync(assetPath)
        context.emitFile({
          type: 'asset',
          source: content,
          fileName: normalize(item)
        })
      }
    })
  }
}
