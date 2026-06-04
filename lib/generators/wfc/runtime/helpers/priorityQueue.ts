export class PriorityQueue<T> {
    private readonly items: T[] = [];

    constructor(
        private readonly compare: (lhs: T, rhs: T) => number
    ) { }

    push(item: T): void {
        this.items.push(item);
        this.shiftUp(this.items.length - 1);
    }

    peek(): T | null {
        return this.items[0] ?? null;
    }

    pop(): T | null {
        if (this.items.length === 0) {
            return null;
        }

        const result = this.items[0];
        const last = this.items.pop();

        if (last !== undefined && this.items.length > 0) {
            this.items[0] = last;
            this.shiftDown(0);
        }

        return result;
    }

    get empty(): boolean {
        return this.items.length === 0;
    }

    private shiftUp(index: number): void {
        let currentIndex = index;

        while (currentIndex > 0) {
            const parentIndex = Math.floor((currentIndex - 1) / 2);

            if (this.compare(this.items[currentIndex], this.items[parentIndex]) >= 0) {
                return;
            }

            this.swap(currentIndex, parentIndex);
            currentIndex = parentIndex;
        }
    }

    private shiftDown(index: number): void {
        let currentIndex = index;

        while (true) {
            const leftIndex = currentIndex * 2 + 1;
            const rightIndex = currentIndex * 2 + 2;
            let bestIndex = currentIndex;

            if (
                leftIndex < this.items.length &&
                this.compare(this.items[leftIndex], this.items[bestIndex]) < 0
            ) {
                bestIndex = leftIndex;
            }

            if (
                rightIndex < this.items.length &&
                this.compare(this.items[rightIndex], this.items[bestIndex]) < 0
            ) {
                bestIndex = rightIndex;
            }

            if (bestIndex === currentIndex) {
                return;
            }

            this.swap(currentIndex, bestIndex);
            currentIndex = bestIndex;
        }
    }

    private swap(lhsIndex: number, rhsIndex: number): void {
        const value = this.items[lhsIndex];
        this.items[lhsIndex] = this.items[rhsIndex];
        this.items[rhsIndex] = value;
    }
}
