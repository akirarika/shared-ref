# SharedRef

SharedRef 可以赋予你创建跨标签页同步的 Ref 的能力，适用于 Vue 框架。

在背后，我们会创建一个 SharedWorker 来维护 Ref 的状态，将一个标签页中值的更改，同步到多个标签页中。

如果用户的浏览器尚不支持 SharedWorker，会自动退化为使用 Worker 来实现。

此外，你还可以自定义 SharedRef 如何存储 Ref 的值。你可以使 Ref 的变量，存储在 IndexedDB 中，即使浏览器被也不会丢失。

甚至，你可以更进一步，将 Ref 的值存储在服务器中，以此来实现云端自动同步的功能。如果你想要这么做，推荐你使用 [Milkio](https://github.com/akirarika/milkio) 来编写你的服务器应用，它可以让你非常简单地实现双向通信，而无需 WebSocket。

## 示例

```vue
<script lang="ts" setup>
import { sharedRef } from 'shared-ref';

const counter = await sharedRef({
    key: "counter",
    value: 0
});

const onClick = () => counter.value++;
</script>

<template>
    <div>{{ counter }}</div>
    <button type="button" @click="onClick">click</button>
</template>
```

## 安装

```bash
npm i shared-ref
```

## 初始化

首先，我们先了解一下什么是 SharedWorker。

SharedWorker 是运行在标签页之外的独立 JavaScript 进程。我们在 SharedWorker 中无法控制页面的 DOM 元素，也没有 `window`、`document` 等对象，它就是游离在页面进程之外的一个 JavaScript 进程。但是，在其中，我们可以和任意同源的页面进行通信。

创建一个 SharedWorker，就等于指定一个 JavaScript 文件，让浏览器以 SharedWorker 的方式来运行它。

我们先建立一个 `worker.ts` 文件，在其中初始化 SharedRef 的 Worker 部分。

```ts
import { defineSharedRefWorker } from "shared-ref";

const sharedRefWorker = defineSharedRefWorker({});
```

我们在页面初始化时，就加载该 Worker。放在你的 `index.ts` 或 `main.ts` 顶部。注意，一定要将代码放在你的 Vue 初始化之前。

```ts
import { initSharedRef } from "shared-ref";

initSharedRef({
  url: new URL("./worker.ts", import.meta.url)
});

// 接下来，才是 Vue 的初始化代码
const app = createApp(App);
```

## 使用

SharedRef 的使用方式，和普通的 Ref 有些差异。

```ts
import { sharedRef } from 'shared-ref';

const counter = await sharedRef({
    key: "counter",
    value: 0
});
```

sharedRef 的参数是传递一个对象，其中的 `value` 就是我们要创建的 Ref 的初始值。`key` 是该Ref 的唯一标识符，需要在整个页面中是唯一的。我们通过 `key` 来维持不同标签页间值的同步，当不同的标签页间创建了相同的 `key` 的 Ref 时，它们就会自动同步。

还有一个值得注意的是，sharedRef 方法的返回值是一个 Promise，因此，你需要添加 `await` 关键字，来等待它加载完成（这非常快）。

## Suspense

由于 sharedRef 是异步加载的，我们需要使用 Suspense 组件包裹，才能使 Vue 支持异步组件。

如果，你在根组件中，就需要使用 SharedRef，那么，你可以将你根组件的代码，全部移动到一个新的组件，然后在你的根组件中，只包含一个 Suspense 并引用你的根组件，像下面这样。

```vue
<template>
    <Suspense>
        <YourRootComponent />
    </Suspense>
</template>
```

## 浅层响应性

普通的 Ref 是深层响应的，因为它会自动将值转换为 Reactive，而 SharedRef 不会这么做。

这意味着，如果你向 SharedRef 中存储了一个对象，那么，你修改这个对象的属性，并不会触发 SharedRef 的更新。

这么做是有意为之的，因为每次值的变更，都会将值复制到多个标签页中，如果你向 SharedRef 中存储了一个庞大的对象或数组，这会导致这些庞大的对象和数组在多个标签页中复制，即使只修改了它们中的一小部分。这会导致性能问题。

如果你想要创建一个对象，但希望它们的值在更新时，也能够监听到变化，你可以改变一下你的写法：

```ts
// 直觉下的写法，除非直接更改 counter.value，否则不会触发响应式变更
const counter = await sharedRef({
    key: "counter",
    value: {
        count1: 0,
        count2: 0
    }
})

// 新的写法，可以触发响应式变更
const counter = {
    count1: await sharedRef({ key: "counter:count1", value: 0 }),
    count2: await sharedRef({ key: "counter:count2", value: 0 })
}
```

## 持久化存储

当所有的标签页都被关闭时，由于 SharedWorker 被销毁，数据将会丢失。当页面重新被打开时，数据将恢复到初始状态。我们可以将数据保存到 IndexedDB 中，来避免数据的丢失。

```ts
import { defineSharedRefWorker,IndexedDBHandler  } from 'shared-ref';

const sharedRefWorker = defineSharedRefWorker({
  debug: true,
  ...IndexedDBHandler(),
});
```

## 自定义存储逻辑

你可以自定义 SharedRef 存储值的逻辑。编辑你的 `worker.ts`：

```ts
const sharedRefWorker = defineSharedRefWorker({
  async bootstrap() {
    // ...
  },
  async getHandler(event) {
    // ...
  },
  async setHandler(event) {
    // ...
  },
});
```

其中，`bootstrap` 方法会在启动时被调用，你可以在这里编写你的初始化逻辑，SharedRef 会等待你方法执行完成，才会开始工作。

`getHandler` 和 `setHandler` 方法会在 SharedRef 的值被获取或设置时被调用。其中，对于 `getHandler` 方法，你需要返回一个对象，像下面这样：

```ts
async getHandler(event) {
    return { empty: true, value: undefined };
    // or
    return { empty: false, value: yourValue };
},
```

当 `empty` 为 `true` 时，表示该值不存在，sharedRef 会使用 `value` 作为默认值。当 `empty` 为 `false` 时，表示该值存在，此时，即便 `value` 为 `undefined`，sharedRef 也会忠实地使用 `undefined` 作为值。

## Meta

你可以为 SharedRef 添加 `meta` 属性，在 `getHandler` 和 `setHandler` 中，可以获取到它们。你可以利用这一点，控制 SharedRef 的行为。

例如，你可以设置，只有指定了 `meta.persistence` 为 `true` 的 Ref，数据才会保存到 IndexedDB 中。

这样，你可以使只有部分的 Ref 保存到 IndexedDB 中，而更多的 Ref 则在所有的标签页被关闭时删除。

```ts
const counter = await sharedRef({
    key: "counter",
    meta: {
        persistence: true
    },
    value: 0
})
```

```ts
async setHandler(event) {
    if (event.meta.persistence === true) {
        // 将数据保存到 indexedDB 中..
    } else {
        // 什么都不做..
    }
},
```

## 扩展持久化存储

自定义存储逻辑，并非意味着不能使用内置的 IndexedDB 存储功能，你可以选择在恰当的时机启用它。

```ts
import { defineSharedRefWorker,IndexedDBHandler  } from 'shared-ref';

const indexeddb = IndexedDBHandler();

const sharedRefWorker = defineSharedRefWorker({
  async bootstrap() {
    await indexeddb.bootstrap();
    // ...
  },
  async getHandler(event) {
    if (...) {
      await indexeddb.getHandler(event);
    }
  },
  async setHandler(event) {
    if (...) {
      await indexeddb.setHandler(event);
    }
  },
});
```