export class QueueDictionary<TKey, TValue> {
    private readonly queue: TKey[] = [];
    private readonly values = new Map<TKey, TValue>();
    private cursor = 0;

    constructor(private readonly createValue: () => TValue) { }

    get(key: TKey): TValue {
        let value = this.values.get(key);

        if (value === undefined) {
            value = this.createValue();
            this.values.set(key, value);
            this.queue.push(key);
        }

        return value;
    }

    dequeue(): { key: TKey; value: TValue } | null {
        if (this.cursor >= this.queue.length) {
            return null;
        }

        const key = this.queue[this.cursor++];
        const value = this.values.get(key);

        if (value === undefined) {
            throw new Error("QueueDictionary lost queued value.");
        }

        this.values.delete(key);
        this.trimConsumedItems();

        return { key, value };
    }

    get empty(): boolean {
        return this.cursor >= this.queue.length;
    }

    clear(): void {
        this.queue.length = 0;
        this.values.clear();
        this.cursor = 0;
    }

    private trimConsumedItems(): void {
        if (this.cursor < 64 || this.cursor * 2 < this.queue.length) {
            return;
        }

        this.queue.splice(0, this.cursor);
        this.cursor = 0;
    }
}