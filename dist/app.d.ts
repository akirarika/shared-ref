import { Ref } from 'vue';

export type SharedRefOptions = {
    url: URL;
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
