import { withResolvers } from "../src";
import { IndexedDBHandler } from "../src/indexeddb";
import { defineSharedRefWorker } from "../src/worker";

const sharedRefWorker = defineSharedRefWorker({
  debug: true,
  ...IndexedDBHandler(),
});
