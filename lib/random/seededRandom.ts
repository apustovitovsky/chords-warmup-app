export class SeededRandom {
    private state: number;

    constructor(seed: string) {
        this.state = this.hashSeed(seed);
    }

    nextFloat(): number {
        this.state = (1664525 * this.state + 1013904223) >>> 0;
        return this.state / 0xffffffff;
    }

    nextInt(min: number, maxInclusive: number): number {
        const value = this.nextFloat();
        return Math.floor(value * (maxInclusive - min + 1)) + min;
    }

    pick<T>(items: readonly T[]): T {
        if (items.length === 0) {
            throw new Error("Cannot pick from an empty array.");
        }

        return items[this.nextInt(0, items.length - 1)];
    }

    chance(probability: number): boolean {
        return this.nextFloat() < probability;
    }

    private hashSeed(seed: string): number {
        let hash = 2166136261;

        for (let i = 0; i < seed.length; i++) {
            hash ^= seed.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }

        return hash >>> 0;
    }
}
