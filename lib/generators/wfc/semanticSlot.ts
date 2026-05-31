import type { Module } from "./module";
import { ModuleSet } from "./moduleSet";

export class SemanticSlot {
    readonly moduleHealth: number[][];
    collapsedModuleId: number | null = null;

    constructor(
        readonly nodeId: number,
        allModules: Module[],
        readonly modules: ModuleSet = new ModuleSet(allModules, true),
        readonly supportNodeIds: number[] = [nodeId],
        readonly supportModules: ModuleSet = modules
    ) {
        this.moduleHealth = [
            new Array(allModules.length).fill(0),
            new Array(allModules.length).fill(0),
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
            throw new Error("SemanticSlot has no possible modules.");
        }

        return removedModules;
    }

    collapse(module: Module): ModuleSet {
        if (this.collapsed) {
            throw new Error("SemanticSlot is already collapsed.");
        }

        if (!this.modules.contains(module)) {
            throw new Error(`Cannot collapse semantic slot to unavailable module "${module.tag}".`);
        }

        const modulesToRemove = this.modules.clone();
        modulesToRemove.remove(module);

        const removedModules = this.removeModules(modulesToRemove);
        this.collapsedModuleId = module.id;

        return removedModules;
    }

    get resolvedModule(): Module | null {
        const modules = this.modules.toArray();

        if (modules.length !== 1) {
            return null;
        }

        return modules[0];
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