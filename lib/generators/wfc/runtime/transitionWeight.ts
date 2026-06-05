import type { RuntimeSlot } from "./runtimeSlot";

export function calculateModuleTransitionWeight(
    slots: RuntimeSlot[],
    slotIndex: number,
    moduleId: number
): number {
    const slot = slots[slotIndex];
    let result = 0;

    for (const neighborContext of slot.neighbors) {
        if (!neighborContext) {
            continue;
        }

        const neighbor = slots[neighborContext.slotIndex];
        const transitionWeights = neighborContext.transitionWeights[moduleId];

        for (const neighborModuleId of neighbor.modules) {
            result += transitionWeights[neighborModuleId];
        }
    }

    return result;
}
