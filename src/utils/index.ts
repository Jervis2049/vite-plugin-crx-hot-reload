export function isJsonString(str) {
  try {
    if (typeof JSON.parse(str) == 'object') {
      return true
    }
  } catch (e) {}
  return false
}
