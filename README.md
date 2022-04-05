> 使用过 vue 或者 mobx 的人大概率都很熟悉**数据双向绑定**这个概念。而且我们也知道 vue2 实现数据拦截的方式主要是通过 **Object.defineProperty** 这一方法来实现的，而 vue3 改用了 **Proxy** 来实现。

下面我想实现一个简单的数据拦截，主要是通过 Proxy 的方式来实现。下文记录了我在实现过程中遇到的一些问题（我实现的比较简单，没有写使用 template 实现视图渲染，直接操作 dom 元素来实现 dom 更新）。

下面我要从以下两个方面来说明一下：

- 如何使用 Object.defineProperty 实现数据双向绑定，使用这个实现双向绑定有什么问题
- 如何使用 Proxy 实现数据双向绑定

## Object.defineProperty

我主要从下面几个方面来介绍一下 Object.defineProperty

- 简单用法
- 实现简单数据拦截
- Object.defineProperty 存在哪些缺点

### 简单用法

Object.defineProperty vue2 和 mobx4 的数据双向绑定就是依赖的这个方法。
这个方法是干什么的呢？**用于给一个对象添加一个新属性或者修改对象的现有属性**

这个方法接收三个参数：

- 第一个是当前对象
- 第二个是属性名称
- 第三个是一个对象：这个对象可以设置两种类型的属性：数据属性和存取属性。

首先数据属性：

- configurable 是否可以删除该属性
- enumerable 该属性是否可以枚举
- writable 是否可以修改
- value 属性值

存取属性：

- configurable 是否可以删除该属性
- enumerable 该属性是否可以枚举
- get 方法 获取属性值
- set 方法 改写属性值

我们数据拦截就是通过 get 和 set 方法来完成的。

### 实现简单数据拦截

首先先简单演示一下如何通过 get 和 set 来做这个数据拦截：

```js
let person = {};
Object.definePorperty(person, 'name', {
  configurable: true,
  enumerable: true,
  get() {
    console.log('拦截到了get操作');
    return this.name;
  },
  set(newValue) {
    console.log('拦截到了set操作');
    this.name = newValue;
  },
});
```

一开始，我写了上面这段代码，感觉没有什么问题。但是在控制台打印时，出现了栈溢出
![image.png](http://ttc-tal.oss-cn-beijing.aliyuncs.com/1607405354/image.png)

原因是什么呢？**一直在调用 get 操作，陷入了死循环**
这里我们需要如何去更改呢？

```js
let person = {};
Object.definePorperty(person, 'name', {
  configurable: true,
  enumerable: true,
  get() {
    console.log('拦截到了get操作');
    return this._name || 'zhangyan';
  },
  set(newValue) {
    console.log('拦截到了set操作');
    this._name = newValue;
  },
});
```

dom 结构:

```html
<div>我的名字：<span>zhangyan</span></div>
<div>爸爸的名字：<span>zhang</span></div>
<div>我喜欢什么？<span>看剧</span></div>
```

我们看到的页面效果是：
![image.png](http://ttc-tal.oss-cn-beijing.aliyuncs.com/1607404893/image.png)
js 代码：

```js
// 设置一个对象person
let person = {
  name: 'zhangyan',
  love: ['看剧'],
  father: {
    father: 'zhang',
  },
};
obserable(person);
window.person = person;
// 设置一个observable方法：
function obserable(data) {
  for (let prop in data) {
    let value = data[prop];
    Object.defineProperty(data, prop, {
      configurable: true,
      enumerable: true,
      get() {
        console.log('触发了get方法', prop);
        return this[`_${prop}`] || value;
      },
      set(newValue) {
        document.getElementById(prop).innerHTML = newValue;
        console.log('触发了set方法', prop);
        this[`_${prop}`] = newValue;
      },
    });
  }
}
```

通过上面代码后，在控制台输入

```js
window.person.name = 'xiaoma';
```

页面视图更改为：
![image.png](http://ttc-tal.oss-cn-beijing.aliyuncs.com/1607404919/image.png)

那么如果我进一步在控制台输入：

```js
window.person.age = 12;
window.person.father.father = 'dama';
window.person.love.push('看小说');
```

上面三个操作，都没有使得页面效果更新，这个原因是什么呢？

### Object.defineProperty 存在哪些缺点

从上面的例子，我们就可以看出其缺点：

- 新增属性无法监听到
- 无法监听深层对象的变化
- 无法监听数组的变化

对于深层对象的话，其实是好解决的，判断某一个属性值是对象的话，就深层递归进行数据拦截。代码如下：

```js
let person = {
  name: 'zhangyan',
  love: ['看剧'],
  father: {
    father: 'zhang',
  },
};
obserable(person);
function obserable(data) {
  for (let prop in data) {
    let value = data[prop];
    observe(value); // 重点是这里
    Object.defineProperty(data, prop, {
      configurable: true,
      enumerable: true,
      get() {
        console.log('触发了get方法', prop);
        return this[`_${prop}`] || value;
      },
      set(newValue) {
        document.getElementById(prop).innerHTML = newValue;
        console.log('触发了set方法', prop);
        this[`_${prop}`] = newValue;
      },
    });
  }
}
function observe(data) {
  // 如果当前值为对象，对该对象内属性遍历进行数据拦截
  if (typeof data !== 'object') return;
  return obserable(data);
}
window.person = person;
```

对于数组的解决方式相对复杂一点，主要是通过改写 Array 的方法来实现。我就不在这里写了，重点还是介绍一下 vue3 和 mobx5 使用的 Proxy 来实现的数据双向绑定。

## Proxy

下面从以下几个方面来阐述：

- Proxy 是什么
- 如何使用 Proxy 实现数据双向绑定
- Proxy 能避免前面 Object.defineProperty 的问题么

### 简单说一下 Proxy

用于创建一个对象的代理，来实现基本操作的拦截和自定义
接收两个参数：
target 目标对象
handler 以函数作为属性的对象，各个属性分别定义了在执行各种操作时的代理行为（13 种行为）

具体不详细说了，其中我们利用 get 行为和 set 行为来实现数据双向绑定

### 如何使用 Proxy 实现数据双向绑定

**第一步：实现一个 observable 方法，拦截其 get set 方法，实现当我们捕获或者更改一个属性时，我们可以捕获到该操作**

```js
function observable(data) {
  let handler = {
    get(target, key, reciever) {
      console.log('拦截get', get);
      return target[key];
    },
    set(target, key, value, reciever) {
      console.log('拦截set', key);
      target[key] = value;
    },
  };
  return new Proxy(data, handler);
}
window.baseData = observable({
  price: 10,
  nums: 10,
  a: 1,
  get total() {
    return this.price * this.nums;
  },
});
```

这样实现了更改 baseData 的属性值的时候，打印了对应的输出。说明我们已经可以捕获到数据的变化了

**第二步：
我们把打印的代码改成更改对应 dom 的 innerHTML 值的方法是否就可以实现数据双向绑定了。**

```js
function observable(data) {
  let handler = {
    get(target, key, reciever) {
      console.log('拦截get', get);
      return target[key];
    },
    set(target, key, value, reciever) {
      console.log('拦截set', key);
      target[key] = value;
      document.getElementById(prop).innerHTML = value;
    },
  };
  return new Proxy(data, handler);
}
```

这样操作下来，我们可以看到在控制台更改 baseData.price 的值时，对应的 dom 的 innerHTML 就更改了。

上面的写法肯定不优雅的，因为我们在 observable 里带上了我们的业务代码。那么可以 observable 传入 data 的时候，再传入一个 callback

```js
function observable(data, callback) {
  let handler = {
    get(target, key, reciever) {
      console.log('拦截get', get);
      return target[key];
    },
    set(target, key, value, reciever) {
      console.log('拦截set', key);
      target[key] = value;
      callback(prop, value);
    },
  };
  return new Proxy(data, handler);
}
window.baseData = observable(
  {
    price: 10,
    nums: 10,
    a: 1,
    get total() {
      return this.price * this.nums;
    },
  },
  (prop, value) => {
    document.getElementById(prop).innerHTML = value;
  }
);
```

这样，确实是实现了一个简单的数据双向绑定了，但是我们可以看到目前还有两个问题：
（1）我们对每一个属性的操作不一定是固定的，这里的 callback 很固定
（2）一进去页面的时候，并没有执行这个 callback，所以页面初始化的时候并没有数据展示

如何解决呢？

**第三步：autorun 函数的实现**

autorun 的功能：
（1）一进入页面就执行其方法
（2）在该方法内依赖的 baseData 的属性值更改了，该方法自动执行

维护一个 listeners 数组，实现一个简单的发布订阅模式

```js
function autorun(fn) {
  listeners.push(fn);
  fn();
}
function observable(data, callback) {
  let handler = {
    get(target, key, reciever) {
      console.log('拦截get', get);
      return target[key];
    },
    set(target, key, value, reciever) {
      console.log('拦截set', key);
      target[key] = value;
      listeners.forEach((cb) => cb());
    },
  };
  return new Proxy(data, handler);
}
window.baseData = observable({
  price: 10,
  nums: 10,
  a: 1,
  get total() {
    return this.price * this.nums;
  },
});
autorun(() => {
  document.getElementById('price').innerHTML = baseData.price;
  document.getElementById('nums').innerHTML = baseData.nums;
  document.getElementById('total').innerHTML = baseData.total;
});
addButton.addEventListener('click', () => {
  baseData.price++;
});
reduceButton.addEventListener('click', () => {
  baseData.price--;
});
```

这样我们已经实现了一个简单的数据双向绑定了，但是我们在控制台上更改 baseData 内的 a 的值时，我们发现：**更改了 a 的值时，同时触发了 price,nums,total 的 get 方法**。

查询原因：就是 set 方法内并没有关联到属性，不管更改了哪一个属性，都会去执行 listeners 内的方法。

**第四步：不相关的属性更改时，不要去触发视图渲染**
怎么解决呢？listeners 从数组转为一个{[prop]: []}的形式

```js
window.globalState = null
let listeners = {}
// Proxy 对象用于创建一个对象的代理，从而实现基本操作的拦截和自定义
function observable (data) {
  let handler = {
    get (target, prop) {
      if (window.globalState) {
        listeners[prop] = listeners[prop] && listeners[prop].length ? [...listeners[prop], window.globalState] : [window.globalState]
      }
      console.log('设置了 get 操作', prop)
      return target[prop]
    },
    set (target, prop, value) {
      console.log('设置了 set 操作', prop)
      target[prop] = value;
       listeners[prop] = listeners[prop] ? listeners[prop] : [
      listeners[prop].forEach(cb => cb())
    }
  }
  return new Proxy(data, handler)
}
function autorun (fn) {
  window.globalState = fn
  fn()
}
```

使用一个 window.globalState 来存储 autorun 的值，在 get 方法时，判断当前 window.globalState 是否存在，如果存在，则说明该属性与 autorun 相关联。

但是，这样还是有一点问题的，就是在 autorun 第一次执行完成时，需要对 window.globalState 重置，否则我们会发现 listeners 的长度会越来越长。

```js
function autorun(fn) {
  window.globalState = fn;
  fn();
  window.globalState = null;
}
```

这样操作完感觉有点完美了，有了前面的 autorun 方法，我们来再实现一个 watch 方法：当满足一定的条件时，我们来做一些其他操作，比如弹出提示

**第五步 watch 方法的实现**
依旧是使用的发布订阅模式，全局定义一个 watchListeners={}
遍历 watch 传入的对象，在属性 set 时，去执行对应的 watch 方法

```js
let watchListeners = {}
function watch (obj) {
  Object.keys(obj).forEach(key => {
    watchListeners[key] = obj[key]
  })
}
set (target, prop, value) {
  console.log('设置了 set 操作', prop)
  let oldValue = target[prop]
  target[prop] = value
  listeners[prop] = listeners[prop] ? listeners[prop] : [
  listeners[prop].forEach(cb => cb())
  watchListeners[prop].call(null, value, oldValue)
target[prop] = value;
}
```

### Proxy 能避免前面 Object.defineProperty 的问题么

经过测试发现
（1）新增属性时，我们发现使用 Proxy 是可以监听到的。
（2）深层对象呢，还是无法深层监听的
（3）数组呢，也是无法深层监听的

Proxy 它是对一个原始对象的代理，它不关心这个对象的具体 key 值，它去拦截的是任意修改 key 或者读取 key 的动作，所以它可以避免第一个问题。

对于问题二和问题三：是无法避免的，所以使用 Proxy 要想实现深层监听，也是需要使用递归调用的

```js
function observable(data) {
  let handler = {
    get(target, key, reciever) {
      if (window.globalState) {
        listeners[key] =
          listeners[key] && listeners[key].length
            ? [...listeners[key], window.globalState]
            : [window.globalState];
      }
      if (typeof target[key] === 'object' && target[key] !== null) {
        return new Proxy(target[key], handler);
      }
      return Reflect.get(target, key, reciever);
    },
    set(target, key, value, reciever) {
      console.log('拦截set', key);
      let oldValue = target[key];
      target[key] = value;
      watchListeners[key] && watchListeners[key].call(null, value, oldValue);
      listeners[key] = listeners[key] ? listeners[key] : [];
      listeners[key].forEach((cb) => cb());
      return Reflect.set(target, key, value, reciever);
    },
  };
  return new Proxy(data, handler);
}
```

补充：使用 Reflect 与 Proxy 搭配使用

```js
let xiaoming = observavle({
  _name: 'xiaoming',
  get name() {
    return this._name;
  },
});
let obj = {
  _name: 'haha',
  __proto__: xiaoming,
};
```

obj.name 希望输出的是'haha'，这样就需要 get name 这里的 this 指向的是 obj。Reflect 传入的第三个参数 reciever 指的就是 Proxy 或者继承 Proxy 的对象。
