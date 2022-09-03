/**
 * 判断是否对象
 */
export const isObject = (obj) => {
  return typeof obj === 'object' && obj !== null
}
/**
 * 判断是否空对象
 */
export const isPlainObject = (obj) => {
  return isObject(obj) && Object.getPrototypeOf(obj) === Object.prototype
}
