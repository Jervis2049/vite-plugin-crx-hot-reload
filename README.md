## Install

```bash
npm i vite-plugin-crx-hot-reload -D

# yarn
yarn add vite-plugin-crx-hot-reload -D

# pnpm
pnpm add vite-plugin-crx-hot-reload -D
```

## Usage

```js
import viteCrxHotReload from 'vite-plugin-crx-hot-reload'

export default {
  plugins: [viteCrxHotReload(/* plugin options */)],
}
```

## Plugin options

### port

- **Type:** `number`
- **Default:** `8181`

Establish a Socket Connection. Send a message to the Chrome extension client to update when a file changes.

### watch

- **Type:** `Object`

The background and content_scripts path must be an absolute path.

**Example:**

```js
viteCrxHotReload({
  watch: {
    background: path.resolve(__dirname, '../', './src/js/background.js'),
    content_scripts: [
      path.resolve(__dirname, '../', './src/js/content_scripts/content1.js'),
      path.resolve(__dirname, '../', './src/js/content_scripts/content2.js'),
    ],
  },
})
```

### buildEnd

- **Type:** `Function`

A callback method for the completion of the first packaged build, in which you can do things like copy and move files.

**Example:**

```js
viteCrxHotReload({
  buildEnd() {
    //do something
  },
})
```
