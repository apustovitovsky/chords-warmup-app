export interface Layout<TValue = string> {
    items: TValue[][];
}

export interface LayoutBuilderOptions {
    resolution: number;
    overlap: number;
}

export class LayoutBuilder<TValue = string> {
    constructor(private readonly values: TValue[]) { }

    build(options: LayoutBuilderOptions): Layout<TValue> {
        const length = this.values.length * options.resolution;
        const items: TValue[][] = Array.from({ length }, () => []);

        for (const segment of this.createSegments()) {
            const startIndex = Math.max(
                0,
                segment.startIndex * options.resolution - options.overlap
            );
            const endIndex = Math.min(
                length,
                segment.endIndex * options.resolution + options.overlap
            );

            for (let slotIndex = startIndex; slotIndex < endIndex; slotIndex++) {
                items[slotIndex].push(segment.value);
            }
        }

        return { items };
    }

    private createSegments(): {
        value: TValue;
        startIndex: number;
        endIndex: number;
    }[] {
        if (this.values.length === 0) {
            return [];
        }

        const result: {
            value: TValue;
            startIndex: number;
            endIndex: number;
        }[] = [];

        let startIndex = 0;
        let currentValue = this.values[0];

        for (let index = 1; index <= this.values.length; index++) {
            const value = this.values[index];

            if (value === currentValue) {
                continue;
            }

            result.push({
                value: currentValue,
                startIndex,
                endIndex: index,
            });

            if (value !== undefined) {
                startIndex = index;
                currentValue = value;
            }
        }

        return result;
    }
}
