var W = Object.defineProperty;
var w = (e, r, t) => r in e ? W(e, r, { enumerable: !0, configurable: !0, writable: !0, value: t }) : e[r] = t;
var g = (e, r, t) => w(e, typeof r != "symbol" ? r + "" : r, t);
import { customRef as p } from "vue";
var i = "SharedWorker" in globalThis, S = class {
  constructor(e, r) {
    /**
     * The actual worker that is used, depending on browser support it can be either a `SharedWorker` or a normal `Worker`.
     */
    g(this, "ActualWorker");
    i ? this.ActualWorker = new SharedWorker(e, r) : this.ActualWorker = new Worker(e, r);
  }
  /**
   * An EventListener called when MessageEvent of type message is fired on the port—that is, when the port receives a message.
   */
  get onmessage() {
    var e;
    return i ? (e = this.ActualWorker) == null ? void 0 : e.port.onmessage : this.ActualWorker.onmessage;
  }
  set onmessage(e) {
    i ? this.ActualWorker.port.onmessage = e : this.ActualWorker.onmessage = e;
  }
  /**
   * An EventListener called when a MessageEvent of type MessageError is fired—that is, when it receives a message that cannot be deserialized.
   */
  get onmessageerror() {
    var e;
    return i ? (e = this.ActualWorker) == null ? void 0 : e.port.onmessageerror : this.ActualWorker.onmessageerror;
  }
  set onmessageerror(e) {
    i ? this.ActualWorker.port.onmessageerror = e : this.ActualWorker.onmessageerror = e;
  }
  /**
   * Starts the sending of messages queued on the port (only needed when using EventTarget.addEventListener; it is implied when using MessagePort.onmessage.)
   */
  start() {
    var e;
    if (i)
      return (e = this.ActualWorker) == null ? void 0 : e.port.start();
  }
  /**
   * Clones message and transmits it to worker's global environment. transfer can be passed as a list of objects that are to be transferred rather than cloned.
   */
  postMessage(e, r) {
    var t;
    return i ? (t = this.ActualWorker) == null ? void 0 : t.port.postMessage(e, r) : this.ActualWorker.postMessage(e, r);
  }
  /**
   * Immediately terminates the worker. This does not let worker finish its operations; it is halted at once. ServiceWorker instances do not support this method.
   */
  terminate() {
    var e;
    return i ? (e = this.ActualWorker) == null ? void 0 : e.port.close() : this.ActualWorker.terminate();
  }
  /**
   * Disconnects the port, so it is no longer active.
   */
  close() {
    return this.terminate();
  }
  /**
   * Returns a MessagePort object used to communicate with and control the shared worker.
   */
  get port() {
    return i ? this.ActualWorker.port : this.ActualWorker;
  }
  /**
   * Is an EventListener that is called whenever an ErrorEvent of type error event occurs.
   */
  get onerror() {
    return this.ActualWorker.onerror;
  }
  set onerror(e) {
    this.ActualWorker.onerror = e;
  }
  addEventListener(e, r, t) {
    var a;
    return i && e !== "error" ? (a = this.ActualWorker) == null ? void 0 : a.port.addEventListener(e, r, t) : this.ActualWorker.addEventListener(e, r, t);
  }
  removeEventListener(e, r, t) {
    var a;
    return i && e !== "error" ? (a = this.ActualWorker) == null ? void 0 : a.port.removeEventListener(e, r, t) : this.ActualWorker.removeEventListener(e, r, t);
  }
  /**
   * Dispatches an event to this EventTarget.
   */
  dispatchEvent(e) {
    return this.ActualWorker.dispatchEvent(e);
  }
};
function y() {
  let e, r;
  return { promise: new Promise((a, l) => {
    e = a, r = l;
  }), resolve: e, reject: r };
}
const A = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";
let E = (e = 21) => {
  let r = "", t = crypto.getRandomValues(new Uint8Array(e));
  for (; e--; )
    r += A[t[e] & 63];
  return r;
}, k;
const h = y(), m = /* @__PURE__ */ new Map(), f = /* @__PURE__ */ new Map(), L = (e) => {
  k = new S(e.url, {
    type: "module"
  }), k.port.start(), k.addEventListener("message", (r) => {
    e != null && e.debug && console.log("[SharedRef] onmessage", r);
    const t = r.data;
    if (t.type === "PONG")
      h.resolve(void 0);
    else if (t.type === "RESULT") {
      const a = m.get(t.id);
      a == null || a.resolve(t);
    } else if (t.type === "SYNC") {
      const a = f.get(t.key);
      a && (a.value = t.value, a.trigger());
    }
  }), k.postMessage({
    type: "PING"
  }), typeof window > "u" && (window.sharedRef = R);
}, R = async (e) => {
  if (!k) throw new Error("[SharedRef] Shared worker not initialized, call initSharedRef(...) first.");
  await h.promise;
  const r = y(), t = `${e.key}_${E()}`;
  m.set(t, r), k.postMessage({
    type: "GET",
    key: e.key,
    meta: e.meta ?? {},
    id: t
  });
  let a;
  const l = await r.promise;
  l.empty === !1 ? a = l.value : a = e.value;
  const o = {};
  if (o.ref = p((u, n) => (o.track = u, o.trigger = n, o.value = a, {
    get() {
      return o.track(), o.value;
    },
    set(c) {
      o.value = c, o.trigger(), k.postMessage({
        type: "SET",
        key: e.key,
        meta: e.meta ?? {},
        value: c
      });
    }
  })), f.has(e.key)) throw new Error(`[SharedRef] Multiple sharedRefs are using the same key: '${e.key}'.`);
  return f.set(e.key, o), o.ref;
}, T = (e) => {
  var u;
  const r = /* @__PURE__ */ new Set(), t = /* @__PURE__ */ new Map(), a = (u = e == null ? void 0 : e.bootstrap) == null ? void 0 : u.call(e), l = async (n, c) => {
    e != null && e.debug && console.log("[SharedRefWorker] onmessage", c);
    const s = c.data;
    if (s.type === "PING")
      await a, n.postMessage({ type: "PONG" });
    else if (s.type === "GET")
      if ("getHandler" in e)
        try {
          const { empty: d, value: v } = await e.getHandler({ key: s.key, meta: s.meta });
          d ? n.postMessage({ type: "RESULT", key: s.key, id: s.id, value: void 0, empty: !0 }) : n.postMessage({ type: "RESULT", key: s.key, id: s.id, value: v, empty: !1 });
        } catch (d) {
          console.error(d);
        }
      else
        t.has(s.key) ? n.postMessage({ type: "RESULT", key: s.key, id: s.id, value: t.get(s.key), empty: !1 }) : n.postMessage({ type: "RESULT", key: s.key, id: s.id, value: void 0, empty: !0 });
    else if (s.type === "SET") {
      if ("getHandler" in e)
        try {
          e.waiting ? await e.setHandler({ key: s.key, value: s.value, meta: s.meta }) : e.setHandler({ key: s.key, value: s.value, meta: s.meta });
        } catch (d) {
          console.error(d);
        }
      else
        t.set(s.key, s.value);
      for (const d of r)
        d !== n && d.postMessage({ type: "SYNC", key: s.key, value: s.value });
    }
  }, o = (n) => {
    r.add(n), n.onmessage = (c) => l(n, c);
  };
  return self.onconnect = (n) => {
    e != null && e.debug && console.log("[SharedRefWorker] onconnect", n);
    const [c] = n.ports;
    o(c);
  }, "SharedWorkerGlobalScope" in self || o(self), {
    broadcast(n, c) {
      for (const s of r)
        s.postMessage({ type: "SYNC", key: n, value: c });
    }
  };
}, j = () => {
  let e;
  return {
    async bootstrap() {
      const r = indexedDB.open("shared_ref_database", 1), { promise: t, resolve: a, reject: l } = y();
      r.onupgradeneeded = (o) => {
        const u = o.target.result;
        u.objectStoreNames.contains("data") || u.createObjectStore("data", { keyPath: "key" });
      }, r.onsuccess = (o) => {
        e = o.target.result, a(e);
      }, r.onerror = l, await t;
    },
    async getHandler(r) {
      const { promise: t, resolve: a, reject: l } = y(), o = e.transaction(["data"], "readonly").objectStore("data").get(r.key);
      o.onsuccess = a, o.onerror = l;
      const u = (await t).target.result;
      return u ? { empty: !1, value: u.value } : { empty: !0, value: void 0 };
    },
    async setHandler(r) {
      const { promise: t, resolve: a, reject: l } = y(), o = e.transaction(["data"], "readwrite").objectStore("data").put({ key: r.key, value: r.value });
      o.onsuccess = a, o.onerror = l, await t;
    }
  };
};
export {
  j as IndexedDBHandler,
  T as defineSharedRefWorker,
  L as initSharedRef,
  R as sharedRef,
  y as withResolvers
};
