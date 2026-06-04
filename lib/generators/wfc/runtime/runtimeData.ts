import type { RuntimeSlot } from "./runtimeSlot";

export interface RuntimeData {
    slots: RuntimeSlot[];
    moduleCapacity: number;
}
