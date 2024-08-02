import { withResolvers } from "./with-resolvers";

export const IndexedDBHandler = () => {
  let db: IDBDatabase;

  return {
    async bootstrap() {
      const request = indexedDB.open("shared_ref_database", 1);
      const { promise, resolve, reject } = withResolvers();
      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("data")) db.createObjectStore("data", { keyPath: "key" });
      };
      request.onsuccess = (event: any) => {
        db = event.target.result;
        resolve(db);
      };
      request.onerror = reject;
      await promise;
    },
    async getHandler(event: any) {
      const { promise, resolve, reject } = withResolvers();
      const request = db.transaction(["data"], "readonly").objectStore("data").get(event.key);
      request.onsuccess = resolve;
      request.onerror = reject;
      const value = (await promise).target.result;
      if (!value) return { empty: true, value: undefined };
      else return { empty: false, value: value.value };
    },
    async setHandler(event: any) {
      const { promise, resolve, reject } = withResolvers();
      const request = db.transaction(["data"], "readwrite").objectStore("data").put({ key: event.key, value: event.value });
      request.onsuccess = resolve;
      request.onerror = reject;
      await promise;
    },
  };
};
