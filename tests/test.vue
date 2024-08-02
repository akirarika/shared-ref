<template>
    <div>hello world</div>
    <div>{{ foo }}</div>
    <button type="button" @click="onClick">click</button>
</template>

<script lang="ts" setup>
import { watchEffect } from 'vue';
import { sharedRef } from '../src/app';

console.warn('foo');


const foo = await sharedRef({
    key: "foo",
    meta: {
        foo: 'bar'
    },
    value: {
        bar: "baz",
        baz: "bar",
    }
});

console.warn('fobaero');

watchEffect(() => {
    console.log('value', foo.value)
})

const onClick = () => {
    foo.value = {
        bar: "baz",
        baz: `${new Date().getTime()}`,
    };
}
</script>