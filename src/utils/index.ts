export function isJsonString(str: string) {
  try {
    return typeof JSON.parse(str) == 'object'
  } catch (e) {}
  return false
}

export function normalizePath(path: string) {
  return path.replace(/\\/g, '/')
}
