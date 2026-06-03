import type { RemovalEvent } from "./removalEvent";

export class PropagationQueue {
    private readonly events: RemovalEvent[] = [];
    private cursor = 0;

    enqueue(event: RemovalEvent): void {
        if (event.modules.empty) {
            return;
        }

        this.events.push(event);
    }

    dequeue(): RemovalEvent | null {
        if (this.cursor >= this.events.length) {
            return null;
        }

        return this.events[this.cursor++];
    }

    get empty(): boolean {
        return this.cursor >= this.events.length;
    }

    clear(): void {
        this.events.length = 0;
        this.cursor = 0;
    }
}