import type { Ref } from "vue";

export type SharedRefMessage = SharedRefMessagePing | SharedRefMessagePong | SharedRefMessageGet | SharedRefMessageResult | SharedRefMessageSet | SharedRefMessageSync;

export type SharedRefMessagePing = {
  type: "PING";
};

export type SharedRefMessagePong = {
  type: "PONG";
};

export type SharedRefMessageGet = {
  type: "GET";
  key: string;
  meta: Record<string, any>;
  id: string;
};

export type SharedRefMessageResult = {
  type: "RESULT";
  key: string;
  id: string;
  empty: boolean;
  value: any;
};

export type SharedRefMessageSet = {
  type: "SET";
  key: string;
  meta: Record<string, any>;
  value: any;
};

export type SharedRefMessageSync = {
  type: "SYNC";
  key: string;
  value: any;
};

export type RefController<T> = { ref: Ref<T>; track: () => void; trigger: () => void; value: T };
