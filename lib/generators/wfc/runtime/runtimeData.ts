import type { ModuleWeights } from "./moduleWeights";
import type { RuntimeSlot } from "./runtimeSlot";

export interface RuntimeData {
    slots: RuntimeSlot[];
    moduleWeights: ModuleWeights;
}
