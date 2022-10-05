import type { ResolvedConfig } from 'vite'
import type { ChromeExtensionManifest, ContentScript } from '../manifest'
import { resolve, dirname, normalize } from 'path'
import { readFileSync } from 'fs'
import less from 'less'
import { isJsonString, normalizePath, replaceExtname } from '../utils'
interface Options {
  input: string
  port: number
  viteConfig: ResolvedConfig
}

export class ManifestProcessor {
  public contentScriptDevPath = 'js/content_scripts/content-dev.js'
  public serviceWorkerPath: string | undefined // service_worker
  public contentScriptPaths: string[] = [] //content_scripts
  public assetPaths: string[] = [] // css & icons
  public cssPaths: string[] = [] // css
  public srcDir: string

  constructor(private options = {} as Options) {
    this.options = options
    this.srcDir = dirname(options.input)
  }

  public normalizeAbsolutePath(paths) {
    return paths.map((item) => {
      return normalizePath(resolve(this.srcDir, item))
    })
  }

  public readManifest() {
    let { input, viteConfig } = this.options
    let manifestFullPath = normalizePath(resolve((viteConfig.root, input!)))
    let manifestRaw = readFileSync(manifestFullPath, 'utf-8')
    if (!isJsonString(manifestRaw)) {
      throw new Error('The manifest.json is not valid.')
    }
    let manifestContent = JSON.parse(manifestRaw)
    return manifestContent
  }

  public getAssetPaths() {
    let manifestContent: ChromeExtensionManifest = this.readManifest()
    let serviceWorkerPath = manifestContent?.background?.service_worker
    if (serviceWorkerPath) {
      this.serviceWorkerPath = normalizePath(
        resolve(this.srcDir, serviceWorkerPath)
      )
    }
    if (manifestContent.icons) {
      const icons = Object.keys(manifestContent.icons)
      if (Array.isArray(icons)) {
        let iconPaths = icons.map((key) => {
          return manifestContent.icons?.[key]
        })
        this.assetPaths = [...this.assetPaths, ...iconPaths]
      }
    }
    if (Array.isArray(manifestContent.content_scripts)) {
      manifestContent.content_scripts.forEach((item: ContentScript) => {
        if (Array.isArray(item.js)) {
          let contentScriptFullPaths = this.normalizeAbsolutePath(item.js)
          this.contentScriptPaths = [
            ...this.contentScriptPaths,
            ...contentScriptFullPaths
          ]
        }
        if (Array.isArray(item.css)) {
          let cssFullPaths = this.normalizeAbsolutePath(item.css)
          this.cssPaths = [...this.cssPaths, ...cssFullPaths]
          this.assetPaths = [...this.assetPaths, ...item.css]
        }
      })
    }

    return {
      serviceWorkerPath: this.serviceWorkerPath,
      contentScriptPaths: this.contentScriptPaths,
      assetPaths: this.assetPaths,
      cssPaths: this.cssPaths,
    }
  }

  public transform(code, id) {
    let data = ''
    if (this.serviceWorkerPath === id) {
      data = `var PORT=${this.options.port};`
      data += readFileSync(resolve(__dirname, 'background.js'), 'utf-8')
    }
    if (code.indexOf('chrome.scripting.executeScript') > 0) {
      code = code.replace(
        /(?<=chrome.scripting.executeScript\()[\s\S]*?(?=\))/gm,
        function (fileStr) {
          return replaceExtname(fileStr, '.ts', '.js')
        }
      )
    }
    return data + code
  }

  //generate manifest.json
  public emitManifest(context) {
    let { input, viteConfig } = this.options
    let manifestFullPath = normalizePath(resolve(viteConfig.root, input!))
    if (manifestFullPath) {
      let manifestContent: ChromeExtensionManifest = this.readManifest()
      let serviceWorker = manifestContent?.background?.service_worker
      if (manifestContent.background && serviceWorker) {
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
              js: ['js/content_scripts/content-dev.js']
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
    let { viteConfig, port } = this.options
    if (viteConfig.mode === 'production') return
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

  public compileLess(context, originPath, fullPath) {
    less
      .render(readFileSync(fullPath, 'utf-8'), {
        paths: [resolve(this.srcDir, dirname(originPath))],
        compress: true
      })
      .then(
        (output) => {
          context.emitFile({
            type: 'asset',
            source: output.css,
            fileName: replaceExtname(normalize(originPath), '.less', '.css')
          })
        },
        (error) => {
          console.log(error)
        }
      )
  }

  // icon & css
  public emitAssets(context) {
    this.assetPaths.forEach((path) => {
      const assetPath = resolve(this.srcDir, path)
      context.addWatchFile(assetPath)
      if (assetPath.endsWith('.less')) {
        this.compileLess(context, path, assetPath)
      } else {
        let content = readFileSync(assetPath)
        context.emitFile({
          type: 'asset',
          source: content,
          fileName: normalize(path)
        })
      }
    })
  }
}
