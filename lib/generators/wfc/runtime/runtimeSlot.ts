import { ModuleSet } from "./moduleSet";

export interface NeighborContext {
    slotIndex: number;
    supportedModules: ModuleSet[];
}

export class RuntimeSlot {
    readonly moduleHealth: number[][];
    collapsedModuleId: number | null = null;

    constructor(
        readonly modules: ModuleSet,
        readonly neighbors: Array<NeighborContext | null>
    ) {
        this.moduleHealth = [
            new Array(modules.capacity).fill(0),
            new Array(modules.capacity).fill(0),
        ];
    }

    removeModules(modulesToRemove: ModuleSet): ModuleSet {
        const removedModules = modulesToRemove.clone();
        removedModules.enforce(this.modules);

        if (removedModules.empty) {
            return removedModules;
        }

        this.modules.removeSet(removedModules);

        if (this.modules.empty) {
            throw new Error("RuntimeSlot has no possible modules.");
        }

        return removedModules;
    }

    collapse(moduleId: number): ModuleSet {
        if (this.collapsed) {
            throw new Error("RuntimeSlot is already collapsed.");
        }

        if (!this.modules.contains(moduleId)) {
            throw new Error(`Cannot collapse runtime slot to unavailable module "${moduleId}".`);
        }

        const modulesToRemove = this.modules.clone();
        modulesToRemove.remove(moduleId);

        const removedModules = this.removeModules(modulesToRemove);
        this.collapsedModuleId = moduleId;

        return removedModules;
    }

    get resolvedModuleId(): number | null {
        const moduleIds = this.modules.toIds();

        if (moduleIds.length !== 1) {
            return null;
        }

        return moduleIds[0];
    }

    get collapsed(): boolean {
        return this.collapsedModuleId !== null;
    }

    get moduleCount(): number {
        return this.modules.count;
    }

    get empty(): boolean {
        return this.modules.empty;
    }
}
