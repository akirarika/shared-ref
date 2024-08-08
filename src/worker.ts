import mitt, { type Emitter } from "mitt";
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

export type WorkerEmitter = Emitter<{
  connect: { port: MessagePort };
  message: MessageEvent<any>;
}> & {
  broadcast: (key: string, value: any) => void;
  ports: Set<MessagePort>;
};

export const defineSharedRefWorker = (options: SharedRefWorkerOptions): WorkerEmitter => {
  const ports = new Set<any>();
  const store = new Map<string, any>();
  const waitingBootstrap = options?.bootstrap?.();
  const emitter = mitt<{ foo: string }>() as any;

  const onMessage = async (port: MessagePort, e: MessageEvent<any>) => {
    if (options?.debug) console.log("[SharedRefWorker] onmessage", e);
    const data = e.data as SharedRefMessage;
    if (typeof data === "object" && data.type === "SHARED_REF$PING") {
      await waitingBootstrap;
      port.postMessage({ type: "SHARED_REF$PONG" } satisfies SharedRefMessagePong);
    } else if (typeof data === "object" && data.type === "SHARED_REF$GET") {
      if ("getHandler" in options) {
        try {
          const { empty, value } = await options.getHandler({ key: data.key, meta: data.meta });
          if (empty) {
            port.postMessage({ type: "SHARED_REF$RESULT", key: data.key, id: data.id, value: undefined, empty: true } satisfies SharedRefMessageResult);
          } else {
            port.postMessage({ type: "SHARED_REF$RESULT", key: data.key, id: data.id, value: value, empty: false } satisfies SharedRefMessageResult);
          }
        } catch (error) {
          console.error(error);
        }
      } else {
        if (!store.has(data.key)) {
          port.postMessage({ type: "SHARED_REF$RESULT", key: data.key, id: data.id, value: undefined, empty: true } satisfies SharedRefMessageResult);
        } else {
          port.postMessage({ type: "SHARED_REF$RESULT", key: data.key, id: data.id, value: store.get(data.key), empty: false } satisfies SharedRefMessageResult);
        }
      }
    } else if (typeof data === "object" && data.type === "SHARED_REF$SET") {
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
        if (p !== port) p.postMessage({ type: "SHARED_REF$SYNC", key: data.key, value: data.value } satisfies SharedRefMessageSync);
      }
    } else {
      emitter.emit("message", e);
    }
  };

  const start = (port: MessagePort) => {
    ports.add(port);
    emitter.emit("connect", { port: port });
    port.onmessage = (e) => onMessage(port, e);
  };

  // @ts-ignore
  self.onconnect = (e) => {
    if (options?.debug) console.log("[SharedRefWorker] onconnect", e);
    const [port] = e.ports;
    start(port);
  };

  if (!("SharedWorkerGlobalScope" in self)) start(self as any);

  emitter.broadcast = (key: string, value: any) => {
    for (const p of ports) {
      p.postMessage({ type: "SHARED_REF$SYNC", key: key, value: value } satisfies SharedRefMessageSync);
    }
  };
  emitter.ports = ports;

  return emitter;
};
