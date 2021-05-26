---
translateHelp: true
---

# 编辑器

在 am-editor 中编辑器是读写分离的模式。编辑模式和阅读模式需要通过不同的模块呈现渲染，因为有`card`模式的存在，编辑器输出的内容也可能是存在交互的，在阅读模式下，我们也可以让插件借助`React` `Vue`等前端框架渲染一些交互组件，简单的说在前端框架下可以实现的效果都可以放在插件里面。例如：可以做一个投票插件，编辑模式下我们可以设置投票选项，阅读模式下可以选择投票，投票后展现投票数量等等。这些功能可能会非常有意思，不像传统编辑器那样输出固定的 html 或者 json 数据，当然我们也支持输出纯 html，呈现无交互内容。

实例化引擎

```ts
import Engine from '@aomao/engine';
...
//初始化
const engine = new Engine("编辑器根节点", {
    plugins: [],
    cards: [],
});
```

虽然是读写分离的模式，但是阅读模式渲染内容的大部分逻辑与编辑模式下相同，所以由引擎提供 View 模块来渲染阅读模式

实例化方式与引擎大致相同

```ts
import { View } from '@aomao/engine';
...
//初始化
const view = new View("渲染器根节点", {
    plugins: [],
    cards: [],
});
```

在插件内部，我们可能需要对阅读模式做一些控制，我们可以通过 `isEngine` 来判定

```ts
import { isEngine } from '@aomao/engine';

...
if(isEngine(this.editor)) {
    //编辑模式
} else {
    //阅读模式
}

...

```

## 编辑模式

编辑模式我们需要控制 DOM 树、光标、事件等等让用户的输入达到最好的预期值与体验，这些都将由引擎`@aomao/engine`来完成

## 阅读模式

阅读模式相对于编辑模式简单得多，不需要改变 DOM 树，光标几乎可以不用控制。`card`插件的交互完全和正常情况下写`React` `Vue`等前端框架的组件一样。