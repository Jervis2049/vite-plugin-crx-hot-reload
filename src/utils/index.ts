import os from 'os'
import path from 'path'

export function isJsonString(str: string) {
  try {
    return typeof JSON.parse(str) == 'object'
  } catch (e) {}
  return false
}

export function slash(p: string): string {
  return p.replace(/\\/g, '/')
}

export function normalizePath(id: string): string {
  return path.posix.normalize(os.platform() === 'win32' ? slash(id) : id)
}

export function replaceExtname(name: string, from: string, to: string) {
  return name.replace(from, to)
}
