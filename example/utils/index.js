import { copy } from 'fs-extra'
import { resolve } from 'path'

const isObject = (obj) => {
  return Object.prototype.toString.call(obj) === '[object Object]'
}

export const handleCopy = async (targets) => {
  if (Array.isArray(targets) && targets.length) {
    for (const target of targets) {
      if (!isObject(target)) {
        throw new Error(`${stringify(target)} target must be an object`)
      }
      const { dest, src } = target
      if (!src || !dest) {
        throw new Error(
          `${stringify(target)} target must have "src" and "dest" properties`
        )
      }
      await copy(src, dest)
    }
  }
}

export const pathResolve = (p) => {
  return resolve(__dirname, '../', p)
}
