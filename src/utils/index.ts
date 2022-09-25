export function isJsonString(str) {
  try {
    return typeof JSON.parse(str) == 'object'
  } catch (e) {}
  return false
}

export function normalizePath(path) {
  return path.replace(/\\/g, '/')
}
