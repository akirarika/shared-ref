import { Emitter } from 'mitt';

type SharedRefWorkerOptionsBase = {
    debug?: boolean;
    bootstrap?: () => Promise<void> | void;
};
type SharedRefWorkerOptionsBaseHandlers = {
    waiting?: boolean;
    getHandler: (options: {
        key: string;
        meta: Record<string, any>;
    }) => {
        empty: boolean;
        value: unknown;
    } | Promise<{
        empty: boolean;
        value: unknown;
    }>;
    setHandler: (options: {
        key: string;
        value: unknown;
        meta: Record<string, any>;
    }) => void | Promise<void>;
};
export type SharedRefWorkerOptions = SharedRefWorkerOptionsBase | (SharedRefWorkerOptionsBase & SharedRefWorkerOptionsBaseHandlers);
export type WorkerEmitter = Emitter<{
    connect: {
        port: MessagePort;
    };
    message: MessageEvent<any>;
}> & {
    broadcast: (key: string, value: any) => void;
    ports: Set<MessagePort>;
};
export declare const defineSharedRefWorker: (options: SharedRefWorkerOptions) => WorkerEmitter;
export {};
