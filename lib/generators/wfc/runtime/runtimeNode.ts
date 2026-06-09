import { ModuleSet } from "./moduleSet";
import { Direction } from "./direction";

export interface RuntimeNeighbor {
    nodeIndex: number;
    supportedModules: ModuleSet[];
}

export class RuntimeNode {
    readonly moduleHealth: number[][];
    collapsedModuleId: number | null = null;

    constructor(
        readonly modules: ModuleSet,
        readonly neighbors: Array<RuntimeNeighbor | null>
    ) {
        this.moduleHealth = Array.from(
            { length: Direction.count },
            () => new Array(modules.capacity).fill(0)
        );
    }

    setModuleHealth(edgeIndex: number, moduleId: number, health: number): void {
        this.moduleHealth[edgeIndex][moduleId] = health;
    }

    incrementModuleHealth(edgeIndex: number, moduleId: number): number {
        return ++this.moduleHealth[edgeIndex][moduleId];
    }

    decrementModuleHealth(edgeIndex: number, moduleId: number): number {
        return --this.moduleHealth[edgeIndex][moduleId];
    }

    getModuleWeight(moduleId: number): number {
        let weight = 0;

        for (const health of this.moduleHealth) {
            weight += health[moduleId];
        }

        return weight;
    }

    removeModules(modulesToRemove: ModuleSet): ModuleSet {
        const removedModules = modulesToRemove.clone();
        removedModules.enforce(this.modules);

        if (removedModules.empty) {
            return removedModules;
        }

        this.modules.removeSet(removedModules);

        if (this.modules.empty) {
            throw new Error("RuntimeNode has no possible modules.");
        }

        return removedModules;
    }

    addModules(modulesToAdd: ModuleSet): ModuleSet {
        const addedModules = modulesToAdd.clone();
        addedModules.exclude(this.modules);

        if (addedModules.empty) {
            return addedModules;
        }

        this.modules.addSet(addedModules);

        return addedModules;
    }

    collapse(moduleId: number): ModuleSet {
        if (this.collapsed) {
            throw new Error("RuntimeNode is already collapsed.");
        }

        if (!this.modules.contains(moduleId)) {
            throw new Error(`Cannot collapse runtime node to unavailable module "${moduleId}".`);
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
