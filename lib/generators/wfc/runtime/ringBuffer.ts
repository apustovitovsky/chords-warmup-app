export class RingBuffer<T> {
    private readonly items: Array<T | null>;
    private position = -1;
    private itemCount = 0;
    private pushedItemCount = 0;

    onOverflow: ((item: T) => void) | null = null;

    constructor(readonly capacity: number) {
        if (capacity <= 0) {
            throw new Error("Ring buffer capacity must be greater than zero.");
        }

        this.items = new Array(capacity).fill(null);
    }

    push(item: T): void {
        this.position = (this.position + 1) % this.capacity;
        const previousItem = this.items[this.position];

        if (previousItem !== null) {
            this.onOverflow?.(previousItem);
        }

        this.items[this.position] = item;
        this.itemCount = Math.min(this.itemCount + 1, this.capacity);
        this.pushedItemCount++;
    }

    peek(): T | null {
        if (this.empty) {
            return null;
        }

        return this.items[this.position];
    }

    pop(): T | null {
        if (this.empty) {
            return null;
        }

        const item = this.items[this.position];

        this.items[this.position] = null;
        this.position = (this.position + this.capacity - 1) % this.capacity;
        this.itemCount--;
        this.pushedItemCount--;

        return item;
    }

    get count(): number {
        return this.itemCount;
    }

    get totalCount(): number {
        return this.pushedItemCount;
    }

    get empty(): boolean {
        return this.count === 0;
    }
}
