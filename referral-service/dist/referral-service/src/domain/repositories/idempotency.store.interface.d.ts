export interface IdempotencyStore {
    exists(key: string): Promise<boolean>;
    put(key: string): Promise<void>;
}
