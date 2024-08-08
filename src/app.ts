import { SharedWorkerPolyfill } from "@okikio/sharedworker";
import { withResolvers } from "./with-resolvers";
import { customRef, type Ref } from "vue";
import type { RefController, SharedRefMessage, SharedRefMessageGet, SharedRefMessageResult, SharedRefMessageSet } from "./types";
import { nanoid } from "nanoid";

let worker: SharedWorkerPolyfill | undefined = undefined;
const workerReady = withResolvers() as PromiseWithResolvers<undefined>;
const waitingGet = new Map<string, PromiseWithResolvers<any>>();
const refs = new Map<string, RefController<any>>();

export type SharedRefOptions = {
  worker: (data: { SharedWorker: new (scriptURL: string | URL, options?: string | WorkerOptions) => SharedWorker }) => { addEventListener: Function };
  debug?: boolean;
};

declare global {
  interface Window {
    sharedRef: typeof sharedRef;
  }
}

export const initSharedRef = (options: SharedRefOptions) => {
  worker = options.worker({ SharedWorker: SharedWorkerPolyfill as any }) as SharedWorkerPolyfill;

  worker.port.start();

  worker.addEventListener("message", (e) => {
    if (options?.debug) console.log("[SharedRef] onmessage", e);
    const data = e.data as SharedRefMessage;
    if (data.type === "PONG") {
      workerReady.resolve(undefined);
    } else if (data.type === "RESULT") {
      const resolvers = waitingGet.get(data.id);
      resolvers?.resolve(data);
    } else if (data.type === "SYNC") {
      const ref = refs.get(data.key);
      if (ref) {
        ref.value = data.value;
        ref.trigger();
      }
    }
  });

  worker!.postMessage({
    type: "PING",
  });

  if (typeof window !== "undefined" && typeof window?.document?.createElement !== "undefined") (window as any).sharedRef = sharedRef;
};

export const sharedRef = async <T>(options: { key: string; value: T; meta?: Record<string, any> }): Promise<Ref<T>> => {
  if (!worker) throw new Error("[SharedRef] Shared worker not initialized, call initSharedRef(...) first.");
  await workerReady.promise;
  const resolvers = withResolvers<T>();
  const id = `${options.key}_${nanoid()}`;
  waitingGet.set(id, resolvers);
  worker!.postMessage({
    type: "GET",
    key: options.key,
    meta: options.meta ?? {},
    id: id,
  } satisfies SharedRefMessageGet);
  let value: any = undefined;
  const result = (await resolvers.promise) as unknown as SharedRefMessageResult;
  if (result.empty === false) {
    value = result.value;
  } else {
    value = options.value;
  }

  const refController = {} as RefController<any>;
  refController.ref = customRef((track, trigger) => {
    refController.track = track;
    refController.trigger = trigger;
    refController.value = value;
    return {
      get() {
        refController.track();
        return refController.value;
      },
      set(newValue) {
        refController.value = newValue;
        refController.trigger();
        worker!.postMessage({
          type: "SET",
          key: options.key,
          meta: options.meta ?? {},
          value: newValue,
        } satisfies SharedRefMessageSet);
      },
    };
  });
  if (refs.has(options.key)) throw new Error(`[SharedRef] Multiple sharedRefs are using the same key: '${options.key}'.`);

  refs.set(options.key, refController);

  return refController.ref;
};
