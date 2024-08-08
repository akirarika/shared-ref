import type { Ref } from "vue";

export type SharedRefMessage = SharedRefMessagePing | SharedRefMessagePong | SharedRefMessageGet | SharedRefMessageResult | SharedRefMessageSet | SharedRefMessageSync;

export type SharedRefMessagePing = {
  type: "SHARED_REF$PING";
};

export type SharedRefMessagePong = {
  type: "SHARED_REF$PONG";
};

export type SharedRefMessageGet = {
  type: "SHARED_REF$GET";
  key: string;
  meta: Record<string, any>;
  id: string;
};

export type SharedRefMessageResult = {
  type: "SHARED_REF$RESULT";
  key: string;
  id: string;
  empty: boolean;
  value: any;
};

export type SharedRefMessageSet = {
  type: "SHARED_REF$SET";
  key: string;
  meta: Record<string, any>;
  value: any;
};

export type SharedRefMessageSync = {
  type: "SHARED_REF$SYNC";
  key: string;
  value: any;
};

export type RefController<T> = { ref: Ref<T>; track: () => void; trigger: () => void; value: T };
