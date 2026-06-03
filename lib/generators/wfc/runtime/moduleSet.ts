const bitsPerItem = 32;

export class ModuleSet implements Iterable<number> {
    private readonly data: number[];

    constructor(readonly capacity: number, initializeFull = false) {
        const wordCount = Math.ceil(this.capacity / bitsPerItem);
        this.data = new Array(wordCount).fill(initializeFull ? ~0 : 0);

        if (initializeFull) {
            this.trimUnusedBits();
        }
    }

    static fromIds(capacity: number, source: Iterable<number>): ModuleSet {
        const result = new ModuleSet(capacity);

        for (const moduleId of source) {
            result.add(moduleId);
        }

        return result;
    }

    get count(): number {
        let result = 0;

        for (const word of this.data) {
            result += countBits(word);
        }

        return result;
    }

    get empty(): boolean {
        return this.data.every((word) => word === 0);
    }

    get full(): boolean {
        if (this.capacity === 0) {
            return true;
        }

        const lastWordIndex = this.data.length - 1;

        for (let i = 0; i < lastWordIndex; i++) {
            if (this.data[i] !== ~0) {
                return false;
            }
        }

        return this.data[lastWordIndex] === this.lastWordUsageMask;
    }

    add(moduleId: number): void {
        const wordIndex = Math.floor(moduleId / bitsPerItem);
        const mask = 1 << (moduleId % bitsPerItem);

        this.data[wordIndex] |= mask;
    }

    addSet(set: ModuleSet): void {
        this.assertCompatible(set);

        for (let i = 0; i < this.data.length; i++) {
            this.data[i] |= set.data[i];
        }
    }

    remove(moduleId: number): boolean {
        const wordIndex = Math.floor(moduleId / bitsPerItem);
        const mask = 1 << (moduleId % bitsPerItem);
        const value = this.data[wordIndex];

        if ((value & mask) === 0) {
            return false;
        }

        this.data[wordIndex] = value & ~mask;
        return true;
    }

    removeSet(set: ModuleSet): void {
        this.assertCompatible(set);

        for (let i = 0; i < this.data.length; i++) {
            this.data[i] &= ~set.data[i];
        }
    }

    contains(moduleId: number): boolean {
        const wordIndex = Math.floor(moduleId / bitsPerItem);
        const mask = 1 << (moduleId % bitsPerItem);

        return (this.data[wordIndex] & mask) !== 0;
    }

    clear(): void {
        this.data.fill(0);
    }

    enforce(mask: ModuleSet): void {
        this.intersect(mask);
    }

    exclude(mask: ModuleSet): void {
        this.removeSet(mask);
    }

    intersect(set: ModuleSet): void {
        this.assertCompatible(set);

        for (let i = 0; i < this.data.length; i++) {
            this.data[i] &= set.data[i];
        }
    }

    clone(): ModuleSet {
        const result = new ModuleSet(this.capacity);

        for (let i = 0; i < this.data.length; i++) {
            result.data[i] = this.data[i];
        }

        return result;
    }

    toIds(): number[] {
        return [...this];
    }

    *[Symbol.iterator](): Iterator<number> {
        for (let moduleId = 0; moduleId < this.capacity; moduleId++) {
            if (this.contains(moduleId)) {
                yield moduleId;
            }
        }
    }

    private get lastWordUsageMask(): number {
        const remainder = this.capacity % bitsPerItem;

        if (remainder === 0) {
            return ~0;
        }

        return 0xffffffff >>> (bitsPerItem - remainder);
    }

    private trimUnusedBits(): void {
        if (this.data.length === 0) {
            return;
        }

        this.data[this.data.length - 1] &= this.lastWordUsageMask;
    }

    private assertCompatible(set: ModuleSet): void {
        if (this.capacity !== set.capacity) {
            throw new Error("ModuleSet instances have different module counts.");
        }
    }
}

function countBits(value: number): number {
    value = value - ((value >>> 1) & 0x55555555);
    value = (value & 0x33333333) + ((value >>> 2) & 0x33333333);

    return (((value + (value >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}
