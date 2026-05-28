export default class RingBuffer<T> {
    private readonly items: T[] = [];
    private readonly capacity: number;

    constructor(capacity: number) {
        this.capacity = capacity;
    }

    get size(): number {
        return this.items.length;
    }

    get maxSize(): number {
        return this.capacity;
    }

    push(item: T): void {
        this.items.push(item);

        if (this.items.length > this.capacity) {
            this.items.shift();
        }
    }

    pushMany(items: T[]): void {
        for (const item of items) {
            this.push(item);
        }
    }

    takeLast(count: number): T[] {
        return this.items.slice(Math.max(0, this.items.length - count));
    }

    lastOrNull(): T | null {
        return this.items[this.items.length - 1] ?? null;
    }

    toArray(): T[] {
        return [...this.items];
    }
}
