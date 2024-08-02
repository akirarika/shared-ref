import type { SharedRefMessage, SharedRefMessagePong, SharedRefMessageResult, SharedRefMessageSync } from "./types";

type SharedRefWorkerOptionsBase = {
  debug?: boolean;
  bootstrap?: () => Promise<void> | void;
};

type SharedRefWorkerOptionsBaseHandlers = {
  waiting?: boolean;
  getHandler: (options: { key: string; meta: Record<string, any> }) => { empty: boolean; value: unknown } | Promise<{ empty: boolean; value: unknown }>;
  setHandler: (options: { key: string; value: unknown; meta: Record<string, any> }) => void | Promise<void>;
};

export type SharedRefWorkerOptions = SharedRefWorkerOptionsBase | (SharedRefWorkerOptionsBase & SharedRefWorkerOptionsBaseHandlers);

export const defineSharedRefWorker = (options: SharedRefWorkerOptions) => {
  const ports = new Set<any>();
  const store = new Map<string, any>();
  const waitingBootstrap = options?.bootstrap?.();

  const onMessage = async (port: any, e: any) => {
    if (options?.debug) console.log("[SharedRefWorker] onmessage", e);
    const data = e.data as SharedRefMessage;
    if (data.type === "PING") {
      await waitingBootstrap;
      port.postMessage({ type: "PONG" } satisfies SharedRefMessagePong);
    } else if (data.type === "GET") {
      if ("getHandler" in options) {
        try {
          const { empty, value } = await options.getHandler({ key: data.key, meta: data.meta });
          if (empty) {
            port.postMessage({ type: "RESULT", key: data.key, id: data.id, value: undefined, empty: true } satisfies SharedRefMessageResult);
          } else {
            port.postMessage({ type: "RESULT", key: data.key, id: data.id, value: value, empty: false } satisfies SharedRefMessageResult);
          }
        } catch (error) {
          console.error(error);
        }
      } else {
        if (!store.has(data.key)) {
          port.postMessage({ type: "RESULT", key: data.key, id: data.id, value: undefined, empty: true } satisfies SharedRefMessageResult);
        } else {
          port.postMessage({ type: "RESULT", key: data.key, id: data.id, value: store.get(data.key), empty: false } satisfies SharedRefMessageResult);
        }
      }
    } else if (data.type === "SET") {
      if ("getHandler" in options) {
        try {
          if (options.waiting) await options.setHandler({ key: data.key, value: data.value, meta: data.meta });
          else void options.setHandler({ key: data.key, value: data.value, meta: data.meta });
        } catch (error) {
          console.error(error);
        }
      } else {
        store.set(data.key, data.value);
      }
      for (const p of ports) {
        if (p !== port) p.postMessage({ type: "SYNC", key: data.key, value: data.value } satisfies SharedRefMessageSync);
      }
    }
  };

  const start = (port: any) => {
    ports.add(port);
    port.onmessage = (e: any) => onMessage(port, e);
  };

  // @ts-ignore
  self.onconnect = (e) => {
    if (options?.debug) console.log("[SharedRefWorker] onconnect", e);
    const [port] = e.ports;
    start(port);
  };

  if (!("SharedWorkerGlobalScope" in self)) start(self);

  return {
    broadcast(key: string, value: any) {
      for (const p of ports) {
        p.postMessage({ type: "SYNC", key: key, value: value } satisfies SharedRefMessageSync);
      }
    },
  };
};
