export interface Layout {
    items: number[][];
}

export interface LayoutBuilderOptions {
    resolution: number;
    overlap: number;
}

export class LayoutBuilder {
    constructor(private readonly domainIds: number[]) { }

    build(options: LayoutBuilderOptions): Layout {
        const length = this.domainIds.length * options.resolution;
        const items: number[][] = Array.from({ length }, () => []);

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
                items[slotIndex].push(segment.domainId);
            }
        }

        return { items };
    }

    private createSegments(): {
        domainId: number;
        startIndex: number;
        endIndex: number;
    }[] {
        if (this.domainIds.length === 0) {
            return [];
        }

        const result: {
            domainId: number;
            startIndex: number;
            endIndex: number;
        }[] = [];

        let startIndex = 0;
        let currentDomainId = this.domainIds[0];

        for (let index = 1; index <= this.domainIds.length; index++) {
            const domainId = this.domainIds[index];

            if (domainId === currentDomainId) {
                continue;
            }

            result.push({
                domainId: currentDomainId,
                startIndex,
                endIndex: index,
            });

            if (domainId !== undefined) {
                startIndex = index;
                currentDomainId = domainId;
            }
        }

        return result;
    }
}
