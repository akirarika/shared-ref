# SharedRef

SharedRef allows you to create synchronized refs across tabs, suitable for Vue framework.

Under the hood, we create a SharedWorker to maintain the state of refs, synchronizing changes in values across multiple tabs.

If the user's browser does not support SharedWorker, it will automatically fall back to using Worker to achieve the same.

Additionally, you can customize how SharedRef stores the values of refs. You can store the ref variables in IndexedDB, ensuring that the values are not lost even if the browser is closed.

Furthermore, you can go a step further and store the values of refs on the server to achieve cloud-based automatic synchronization. If you wish to do this, we recommend using [Milkio](https://github.com/akirarika/milkio) to build your server application, as it allows for easy bidirectional communication without the need for WebSockets.

## Example

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

## Installation

```bash
npm i shared-ref
```

## Initialization

First, let's understand what a SharedWorker is.

A SharedWorker is an independent JavaScript process running outside the tab. We cannot control DOM elements of the page within a SharedWorker, and it does not have objects like `window`, `document`, etc. It is a JavaScript process running independently of the page process. However, it can communicate with any same-origin page.

Creating a SharedWorker is like specifying a JavaScript file to run as a SharedWorker.

Let's create a `worker.ts` file and initialize the Worker part of SharedRef in it.

```ts
import { defineSharedRefWorker } from "shared-ref";

const sharedRefWorker = defineSharedRefWorker({});
```

Load this Worker when the page initializes. Place this in your `index.ts` or `main.ts` at the top, before your Vue initialization.

```ts
import { initSharedRef } from "shared-ref";

initSharedRef({
  url: new URL("./worker.ts", import.meta.url)
});

// Next comes your Vue initialization code
const app = createApp(App);
```

## Usage

The usage of SharedRef differs slightly from a regular Ref.

```ts
import { sharedRef } from 'shared-ref';

const counter = await sharedRef({
    key: "counter",
    value: 0
});
```

The parameter for sharedRef is an object, where `value` is the initial value of the Ref you want to create. `key` is a unique identifier for the Ref and needs to be unique throughout the page. We use `key` to maintain synchronization of values between different tabs. When Refs with the same `key` are created in different tabs, they will automatically synchronize.

It's worth noting that the return value of the sharedRef method is a Promise, so you need to add the `await` keyword to wait for it to load (which is very fast).

## Suspense

Since sharedRef is asynchronously loaded, we need to wrap it with the Suspense component to make Vue support asynchronous components.

If you need to use SharedRef in your root component, you can move all your root component code to a new component and then in your root component, include only a Suspense and reference your root component like this:

```vue
<template>
    <Suspense>
        <YourRootComponent />
    </Suspense>
</template>
```

## Shallow Reactivity

Regular Refs are deeply reactive because they automatically convert values to reactive, but SharedRef does not.

This means that if you store an object in SharedRef and then modify properties of that object, it will not trigger an update in SharedRef.

This behavior is intentional because every time the value changes, it is copied to multiple tabs. Storing a large object or array in SharedRef would lead to performance issues as these large objects or arrays would be copied to multiple tabs even if only a small part of them is modified.

If you want to create an object but also want its values to be reactive when updated, you can change your approach like this:

```ts
// Intuitive way of writing, will not trigger reactivity unless counter.value is directly modified
const counter = await sharedRef({
    key: "counter",
    value: {
        count1: 0,
        count2: 0
    }
})

// New way of writing, can trigger reactivity
const counter = {
    count1: await sharedRef({ key: "counter:count1", value: 0 }),
    count2: await sharedRef({ key: "counter:count2", value: 0 })
}
```

## Persistent Storage

When all tabs are closed, data will be lost as the SharedWorker is destroyed. When the page is reopened, the data will revert to its initial state. To prevent data loss, we can save data to IndexedDB.

```ts
import { defineSharedRefWorker, IndexedDBHandler } from 'shared-ref';

const sharedRefWorker = defineSharedRefWorker({
  debug: true,
  ...IndexedDBHandler(),
});
```

## Custom Storage Logic

You can customize how SharedRef stores values. Edit your `worker.ts`:

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

The `bootstrap` method is called at startup, where you can write your initialization logic. SharedRef will wait for this method to complete before starting its work.

The `getHandler` and `setHandler` methods are called when the value of SharedRef is retrieved or set. For the `getHandler` method, you need to return an object like this:

```ts
async getHandler(event) {
    return { empty: true, value: undefined };
    // or
    return { empty: false, value: yourValue };
},
```

When `empty` is `true`, it means the value does not exist, and SharedRef will use `value` as the default value. When `empty` is `false`, it means the value exists. Even if `value` is `undefined`, SharedRef will faithfully use `undefined` as the value.

## Meta

You can add a `meta` attribute to SharedRef, which can be accessed in `getHandler` and `setHandler`. You can use this to control the behavior of SharedRef.

For example, you can set that only Refs with `meta.persistence` set to `true` will be saved to IndexedDB.

This way, you can choose to save only certain Refs to IndexedDB, while others are deleted when all tabs are closed.

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
        // Save data to indexedDB...
    } else {
        // Do nothing...
    }
},
```

## Extending Persistent Storage

Customizing storage logic does not mean you cannot use the built-in IndexedDB storage feature. You can choose to enable it at the right time.

```ts
import { defineSharedRefWorker, IndexedDBHandler } from 'shared-ref';

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