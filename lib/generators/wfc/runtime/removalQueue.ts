import { ModuleSet } from "./moduleSet";
import { QueueDictionary } from "./helpers/queueDictionary";

export class RemovalQueue {
    private readonly queue: QueueDictionary<number, ModuleSet>;

    constructor(moduleCapacity: number) {
        this.queue = new QueueDictionary(
            () => new ModuleSet(moduleCapacity)
        );
    }

    enqueue(slotIndex: number, modules: ModuleSet): void {
        if (modules.empty) {
            return;
        }

        this.queue.get(slotIndex).addSet(modules);
    }

    dequeue(): {
        slotIndex: number;
        modules: ModuleSet;
    } | null {
        const item = this.queue.dequeue();

        if (!item) {
            return null;
        }

        return {
            slotIndex: item.key,
            modules: item.value,
        };
    }

    get empty(): boolean {
        return this.queue.empty;
    }

    clear(): void {
        this.queue.clear();
    }
}
