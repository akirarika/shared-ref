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
  worker: (data: { SharedWorker: new (scriptURL: string | URL, options?: string | WorkerOptions) => SharedWorker }) => {
    addEventListener: Function;
  };
  debug?: boolean;
};

declare global {
  interface Window {
    sharedRef: typeof sharedRef;
  }
}

export const initSharedRef = (options: SharedRefOptions): SharedWorkerPolyfill => {
  worker = options.worker({ SharedWorker: SharedWorkerPolyfill as any }) as SharedWorkerPolyfill;

  if (worker?.port?.start) worker.port.start();

  worker.addEventListener("message", (e) => {
    if (options?.debug) console.log("[SharedRef] onmessage", e);
    const data = e.data as SharedRefMessage;
    if (data.type === "SHARED_REF$PONG") {
      workerReady.resolve(undefined);
    } else if (data.type === "SHARED_REF$RESULT") {
      const resolvers = waitingGet.get(data.id);
      resolvers?.resolve(data);
    } else if (data.type === "SHARED_REF$SYNC") {
      const ref = refs.get(data.key);
      if (ref) {
        ref.value = data.value;
        ref.trigger();
      }
    }
  });

  worker!.postMessage({
    type: "SHARED_REF$PING",
  });

  if (typeof window !== "undefined" && typeof window?.document?.createElement !== "undefined") (window as any).sharedRef = sharedRef;

  return worker;
};

export const sharedRef = async <T>(options: { key: string; value: T; meta?: Record<string, any> }): Promise<Ref<T>> => {
  if (typeof window !== "undefined" && typeof window?.document?.createElement !== "undefined") {
    if (!worker) throw new Error("[SharedRef] Shared worker not initialized, call initSharedRef(...) first.");
    await workerReady.promise;
    const resolvers = withResolvers<T>();
    const id = `${options.key}_${nanoid()}`;
    waitingGet.set(id, resolvers);
    worker!.postMessage({
      type: "SHARED_REF$GET",
      key: options.key,
      meta: options.meta ?? {},
      id: id,
    } satisfies SharedRefMessageGet);

    if (refs.has(options.key)) return refs.get(options.key)!.ref;

    const refController = {} as RefController<any>;
    refController.ref = customRef((track, trigger) => {
      refController.track = track;
      refController.trigger = trigger;
      refController.value = options.value;
      return {
        get() {
          refController.track();
          return refController.value;
        },
        set(newValue) {
          refController.value = newValue;
          refController.trigger();
          worker!.postMessage({
            type: "SHARED_REF$SET",
            key: options.key,
            meta: options.meta ?? {},
            value: newValue,
          } satisfies SharedRefMessageSet);
        },
      };
    });

    refs.set(options.key, refController);

    resolvers.promise.then((v) => {
      const result = v as unknown as SharedRefMessageResult;
      if (result.empty === false) {
        refController.value = result;
        refController.trigger();
      }
    });

    return refController.ref;
  } else {
    const cref = customRef((track, trigger) => {
      let value = options.value;
      return {
        get() {
          track();
          return value;
        },
        set(newValue) {
          value = newValue;
          trigger();
        },
      };
    });

    return cref;
  }
};
