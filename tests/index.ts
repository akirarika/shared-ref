import { createApp } from "vue";
import indexComponent from "./index.vue";
import { initSharedRef } from "../src/app";

initSharedRef({
  url: new URL("./worker.ts", import.meta.url),
  debug: true,
});

const app = createApp(indexComponent);

app.mount("#app");
