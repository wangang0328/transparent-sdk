# 性能

### 如何衡量站点性能
- 站点性能 不单单是页面的加载速度、渲染速度，而是要关注从页面开始加载到被关闭的整个过程中，用户对性能的感知。
- 站点性能分为两类： 一类是首屏性能，另一类是运行时性能。前者衡量的是页面从加载开始到可以稳定交互的性能情况，后者是从页面从稳定后到关闭时的性能

### 首屏性能
#### 何时开始渲染：FP && FCP
- FP(First Paint): 页面第一个像素渲染到屏幕上所用时间
  一般会在 HTML 解析完成或者解析一部分时触发
  ```javascript
  const fp = performance.getEntries('paint').filter(entry => entry.name === 'first-paint')[0].startTime
  ```

- FCP(First Contentful Paint): 开始绘制内容的时间，包括任何文字、图片、非空白的 canvas 或 SVG
```javascript
const fcp = performance.getEntries('paint').filter(entry => entry.name === 'first-contentful-paint')[0].startTime
```

- FP 和 FCP 的关系
浏览器渲染的界面可能是‘内容’，例如文本，可能也不是内容，例如红色背景的div。 FCP指的是渲染出第一个内容的事件，而FCP 指渲染出第一个像素点，渲染出的东西可能是内容，也可能不是

有节点不一定有渲染，如果没有任何样式，那也就不用渲染了
如果html本身有内容 或 js 脚本很快能创建内容，那么FP和FCP会一起触发。否则FP比FCP先触发，但是不可能出现FCP先于FP。

- FP 和 DCL 的先后关系
浏览器不一定等到所有元素解析完之后才会渲染，如果节点元素比较少，浏览器会等加载完成后再渲染， 如果节点比较多，会边解析边渲染，此时FP的执行时机要早于 DCL

#### 何时渲染出主要内容 LCP && FMP && SI
- LCP(Largest Contentful Paint)：视口内最大内容绘制时间，随着时间的推移，该值可能会变化
```javascript
new PerformanceObserver((entryList) => {
  for (let entry of entryList.getEntries()) {
    console.log('lcp---', entry.startTime)
  }
}).boserve({ entryTypes: 'largest-contentful-paint', buffered: true })
```

- SI(Speed Index), 衡量页面可视区域的加载速度，反应页面的加载体验差异
计算复杂，指标难以解释，一般在实验室用

- FMP(First Meaningful Paint), 完成首次有意义内容绘制的时间
计算消耗性能，容易计算错误，一般使用LCP 就可以了

#### 何时可以交互 TTI && TBT
- TTI(Time To Interactive) 页面从开始加载到主要子资源完成渲染，并能快速、可靠地响应用户输入的时间点。
- TBT(Total Blocking Time)， 页面从FCP 到 TTI 之间的阻塞时间，一般用来量化主线程在空闲之前的繁忙程度

TTI 虽然可以衡量页面可以交互的时间点，但是无法感知这个期间浏览器的繁忙状态，而结合TBT，就能帮助理解在加载期间，页面无法响应用户输入的时间有多久

#### 交互是否有延迟 FID
- FID(First Input Delay), 用户第一次与页面交互(例如当他们点击链接、点击按钮的时候)直到浏览器对交互做出响应，并且实际能够开始处理事件程序所经过的时间
```javascript
const observer = new PerformanceObserver((entryList) => {
  for (let entry of entryList.getEntries()) {
    console.log(entry.startTime)
  }
})
observer.observe({ entryTypes: 'first-input-delay', buffered: true })
```

### 运行时性能
- Login Tasks
占用主线程时长达50ms及以上的任务
```javascript
const observer = new PerformanceObserver((entryList) => {
  for (let entry of entryList.getEntries()) {
    console.log(entry.startTime)
  }
})
observer.observe({ entryTypes: 'longtask', buffered: true }
```
- Input Delay
输入延迟

### 相关概念
#### 白屏和首屏
- 白屏
白屏 = 从输入url开始 - 页面第一个像素渲染的时间
白屏结束时间 = FP事件触发时间

- 首屏
首屏 = 从输入url开始- 页面第一个内容绘制的时间
首屏结束时间 = FCP事件触发时间


### 几个时间点的解释与理解

#### DOMContentLoaded
当 HTML 文档完全解析，且所有延迟脚本（<script defer src="…"> 和 <script type="module">）下载和执行完毕后，会触发 DOMContentLoaded 事件。它不会等待图片、子框架和异步脚本(async)等其他内容完成加载。
DOMContentLoaded 不会等待样式表加载，但延迟脚本会等待样式表，而且 DOMContentLoaded 事件排在延迟脚本之后。此外，非延迟或异步的脚本（如 <script>）将等待已解析的样式表加载。
许多 JavaScript 框架都会等待此事件，然后才会开始执行自己的逻辑 ? 因为 js 框架需要拿到要挂载的DOM节点
- 其实也就是样式表会阻塞 js的执行，js要等到css加载解析完成后执行，js 会阻塞 HTML 文档解析
- 如果没有样式文件，DOMContentLoaded 触发时，可能异步脚本还没有加载完成
- 此时可能会开始构建渲染树，为什么说是可能哪？ 因为如果没有js脚本，有css样式文件，此时css可能还在加载，没有构建成 CSSOM，所以 此时还不能开始构建渲染树，但是绝大多数网站都会有js脚本，那么通常来说，此时DOM 和 CSSOM 已经准备就绪。

#### domInteractive
浏览器解析完成所有的 HTML 且 DOM 构建完成的时间点
如果没有阻止js的解析器(比如css)，domInteractive 会立即触发 DOMContentLoaded
- domInteractive 和 DomContentLoaded 的时间先后顺序： domInteractive 会早于或等于 DomContentLoaded 的时间点

#### domComplete
顾名思义，所有处理已完成，网页上的所有资源（图片等）都已下载完毕，也就是说，加载旋转图标已停止旋转。



