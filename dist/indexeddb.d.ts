export declare const IndexedDBHandler: () => {
    bootstrap(): Promise<void>;
    getHandler(event: any): Promise<{
        empty: boolean;
        value: any;
    }>;
    setHandler(event: any): Promise<void>;
};
