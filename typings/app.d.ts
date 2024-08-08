import { Ref } from 'vue';

export type SharedRefOptions = {
    worker: (sharedWorker: new (scriptURL: string | URL, options?: string | WorkerOptions) => SharedWorker) => {
        addEventListener: Function;
    };
    debug?: boolean;
};
declare global {
    interface Window {
        sharedRef: typeof sharedRef;
    }
}
export declare const initSharedRef: (options: SharedRefOptions) => void;
export declare const sharedRef: <T>(options: {
    key: string;
    value: T;
    meta?: Record<string, any>;
}) => Promise<Ref<T>>;
