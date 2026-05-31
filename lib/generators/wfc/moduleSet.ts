import type { Module } from "./module";

const bitsPerItem = 32;

export class ModuleSet implements Iterable<Module> {
    private readonly moduleCount: number;
    private readonly modules: Module[];
    private readonly data: number[];

    constructor(modules: Module[], initializeFull = false) {
        this.modules = modules;
        this.moduleCount = modules.length;

        const wordCount = Math.ceil(this.moduleCount / bitsPerItem);
        this.data = new Array(wordCount).fill(initializeFull ? ~0 : 0);

        if (initializeFull) {
            this.trimUnusedBits();
        }
    }

    static fromModules(modules: Module[], source: Iterable<Module>): ModuleSet {
        const result = new ModuleSet(modules);

        for (const module of source) {
            result.add(module);
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
        if (this.moduleCount === 0) {
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

    add(module: Module): void {
        this.addIndex(module.id);
    }

    addIndex(moduleIndex: number): void {
        const wordIndex = Math.floor(moduleIndex / bitsPerItem);
        const mask = 1 << (moduleIndex % bitsPerItem);

        this.data[wordIndex] |= mask;
    }

    addSet(set: ModuleSet): void {
        this.assertCompatible(set);

        for (let i = 0; i < this.data.length; i++) {
            this.data[i] |= set.data[i];
        }
    }

    remove(module: Module): boolean {
        return this.removeIndex(module.id);
    }

    removeIndex(moduleIndex: number): boolean {
        const wordIndex = Math.floor(moduleIndex / bitsPerItem);
        const mask = 1 << (moduleIndex % bitsPerItem);
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

    contains(module: Module): boolean {
        return this.containsIndex(module.id);
    }

    containsIndex(moduleIndex: number): boolean {
        const wordIndex = Math.floor(moduleIndex / bitsPerItem);
        const mask = 1 << (moduleIndex % bitsPerItem);

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
        const result = new ModuleSet(this.modules);

        for (let i = 0; i < this.data.length; i++) {
            result.data[i] = this.data[i];
        }

        return result;
    }

    toArray(): Module[] {
        return [...this];
    }

    *[Symbol.iterator](): Iterator<Module> {
        for (let moduleIndex = 0; moduleIndex < this.moduleCount; moduleIndex++) {
            if (this.containsIndex(moduleIndex)) {
                yield this.modules[moduleIndex];
            }
        }
    }

    private get lastWordUsageMask(): number {
        const remainder = this.moduleCount % bitsPerItem;

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
        if (this.moduleCount !== set.moduleCount) {
            throw new Error("ModuleSet instances have different module counts.");
        }
    }
}

function countBits(value: number): number {
    value = value - ((value >>> 1) & 0x55555555);
    value = (value & 0x33333333) + ((value >>> 2) & 0x33333333);

    return (((value + (value >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}
