import { SharedWorkerPolyfill } from "@okikio/sharedworker";
import { withResolvers } from "./with-resolvers";
import { customRef, type Ref } from "vue";
import type { RefController, SharedRefMessage, SharedRefMessageGet, SharedRefMessageResult, SharedRefMessageSet } from "./types";
import { nanoid } from "nanoid";

const workerInitd = withResolvers() as PromiseWithResolvers<undefined>;
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
    __sharedRefWorker: SharedWorkerPolyfill;
  }
}

export const initSharedRef = (options: SharedRefOptions): SharedWorkerPolyfill => {
  window.__sharedRefWorker = options.worker({ SharedWorker: SharedWorkerPolyfill as any }) as SharedWorkerPolyfill;
  workerInitd.resolve(undefined);

  if (window.__sharedRefWorker?.port?.start) window.__sharedRefWorker.port.start();

  window.__sharedRefWorker.addEventListener("message", (e) => {
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

  window.__sharedRefWorker.postMessage({
    type: "SHARED_REF$PING",
  });

  if (typeof window !== "undefined" && typeof window?.document?.createElement !== "undefined") (window as any).sharedRef = sharedRef;

  return window.__sharedRefWorker;
};

export const sharedRef = async <T>(options: { key: string; value: T; meta?: Record<string, any>; waiting?: boolean }): Promise<Ref<T>> => {
  if (typeof window !== "undefined" && typeof window?.document?.createElement !== "undefined") {
    await workerInitd.promise;
    await workerReady.promise;
    const worker = window.__sharedRefWorker;
    const resolvers = withResolvers<T>();
    const id = `${options.key}_${nanoid()}`;
    waitingGet.set(id, resolvers);
    worker!.postMessage({
      type: "SHARED_REF$GET",
      key: options.key,
      meta: options.meta ?? {},
      id: id,
    } satisfies SharedRefMessageGet);

    if (!options.waiting) {
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
          refController.value = result.value;
          refController.trigger();
        }
      });

      return refController.ref;
    } else {
      let value: any = undefined;
      const result = (await resolvers.promise) as unknown as SharedRefMessageResult;
      if (result.empty === false) {
        value = result.value;
      } else {
        value = options.value;
      }

      if (refs.has(options.key)) return refs.get(options.key)!.ref;

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
              type: "SHARED_REF$SET",
              key: options.key,
              meta: options.meta ?? {},
              value: newValue,
            } satisfies SharedRefMessageSet);
          },
        };
      });

      refs.set(options.key, refController);

      return refController.ref;
    }
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
