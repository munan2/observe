/*
 * @Description: 
 * @Version: 2.0
 * @Autor: zhangyan
 * @Date: 2020-12-08 15:19:16
 * @LastEditors: zhangyan
 * @LastEditTime: 2020-12-08 17:26:37
 */
window.globalState = null
let listeners = {}
let watchListeners = {}
function observable (data) {
  let handler = {
    get (target, key, reciever) {
      if (window.globalState) {
        listeners[key] = listeners[key] && listeners[key].length ? [...listeners[key], window.globalState] : [window.globalState]
      }
      if (typeof target[key] === 'object' && target[key] !== null) {
        return new Proxy(target[key], handler)
      }
      return target[key]
      // return Reflect.get(target, key, reciever)
    },
    set (target, key, value, reciever) {
      console.log('拦截set', key)
      let oldValue = target[key]
      target[key] = value;
      watchListeners[key] && watchListeners[key].call(null, value, oldValue)
      listeners[key] = listeners[key] ? listeners[key] : []
      listeners[key].forEach(cb => cb())
      // return true
      // return Reflect.set(target, key, value, reciever)
    }
  }
  return new Proxy(data, handler)
}
// 初始化的时候执行一次，且每一次更改属性的值的时候，都会触发重新渲染
// 使用一个事件订阅发布模式，get的时候将 重新渲染的事件 塞入到一个listeners内
// 每一次set的时候，就去拿出listeners的方法去执行
function autorun (fn) {
  window.globalState = fn
  fn()
  window.globalState = null
}
function watch (obj) {
  Object.keys(obj).forEach(key => {
    watchListeners[key] = obj[key]
  })
}
window.observable = observable
window.autorun = autorun
window.watch = watch
