/*
 * @Description: 
 * @Version: 2.0
 * @Autor: zhangyan
 * @Date: 2020-12-08 15:19:09
 * @LastEditors: zhangyan
 * @LastEditTime: 2020-12-08 17:43:30
 */
function obserable (data) {
  for (let prop in data) {
    let value = data[prop]
    observe(value)
    Object.defineProperty(data, prop, {
      configurable: true,
      enumerable: true,
      get () {
        console.log('触发了get方法', prop)
        return this[`_${prop}`] || value
      },
      set (newValue) {
        document.getElementById(prop).innerHTML = newValue
        console.log('触发了set方法', prop)
        this[`_${prop}`] = newValue
      }
    })
  }
}
function observe (data) {
  if (typeof data !== 'object') return
  return obserable(data)
}
window.obserable = obserable