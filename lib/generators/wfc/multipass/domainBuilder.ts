import { ModuleSet } from "../runtime/moduleSet";
import { PatternCollection, PatternDefinition } from "./patternDefinition";

export interface PatternModule<TValue> {
    id: number;
    domain: TValue;
    value: TValue;
}

export class DomainBuilder<TValue = string> {
    build(definition: PatternCollection<TValue>): Domain<TValue> {
        const modules = this.createModules(definition.patterns);
        const transitions = this.createTransitions(definition.patterns);
        const modulesByDomain = this.createModulesByDomain(modules);
        const supportByDomain = this.createSupportByDomain(
            modules,
            modulesByDomain,
            transitions
        );

        return new Domain(
            modules,
            modulesByDomain,
            supportByDomain
        );
    }

    private createModules(
        patterns: PatternDefinition<TValue>[]
    ): PatternModule<TValue>[] {
        const modules: PatternModule<TValue>[] = [];

        for (const pattern of patterns) {
            for (const domain of pattern.parentValues) {
                for (const value of pattern.values) {
                    if (this.hasModule(modules, domain, value)) {
                        continue;
                    }

                    modules.push({
                        id: modules.length,
                        domain,
                        value,
                    });
                }
            }
        }

        return modules;
    }

    private createModulesByDomain(
        modules: PatternModule<TValue>[]
    ): Map<TValue, ModuleSet> {
        const result = new Map<TValue, ModuleSet>();

        for (const module of modules) {
            let moduleSet = result.get(module.domain);

            if (!moduleSet) {
                moduleSet = new ModuleSet(modules.length);
                result.set(module.domain, moduleSet);
            }

            moduleSet.add(module.id);
        }

        return result;
    }

    private createTransitions(
        patterns: PatternDefinition<TValue>[]
    ): Array<{ from: TValue; to: TValue }> {
        const transitions: Array<{ from: TValue; to: TValue }> = [];

        for (const pattern of patterns) {
            for (let index = 0; index < pattern.values.length - 1; index++) {
                transitions.push({
                    from: pattern.values[index],
                    to: pattern.values[index + 1],
                });
            }
        }

        return transitions;
    }

    private createSupportByDomain(
        modules: PatternModule<TValue>[],
        modulesByDomain: Map<TValue, ModuleSet>,
        transitions: Array<{ from: TValue; to: TValue }>
    ): Map<TValue, Map<number, ModuleSet>> {
        const result = new Map<TValue, Map<number, ModuleSet>>();

        for (const [targetDomain, targetModules] of modulesByDomain) {
            const supportBySourceModule = new Map<number, ModuleSet>();

            for (const sourceModule of modules) {
                const supportedModules = new ModuleSet(modules.length);

                for (const targetModuleId of targetModules) {
                    const targetModule = modules[targetModuleId];

                    if (this.hasTransition(
                        transitions,
                        sourceModule.value,
                        targetModule.value
                    )) {
                        supportedModules.add(targetModule.id);
                    }
                }

                supportBySourceModule.set(sourceModule.id, supportedModules);
            }

            result.set(targetDomain, supportBySourceModule);
        }

        return result;
    }

    private hasModule(
        modules: PatternModule<TValue>[],
        domain: TValue,
        value: TValue
    ): boolean {
        return modules.some((module) =>
            module.domain === domain &&
            module.value === value
        );
    }

    private hasTransition(
        transitions: Array<{ from: TValue; to: TValue }>,
        from: TValue,
        to: TValue
    ): boolean {
        return transitions.some((transition) =>
            transition.from === from &&
            transition.to === to
        );
    }
}

export class Domain<TValue = string> {
    constructor(
        readonly modules: PatternModule<TValue>[],
        private readonly modulesByDomain: Map<TValue, ModuleSet>,
        private readonly supportByDomain: Map<TValue, Map<number, ModuleSet>>
    ) { }

    getModuleSet(domain: TValue): ModuleSet {
        return this.modulesByDomain.get(domain)
            ?? new ModuleSet(this.modules.length);
    }

    getSupportedModules(
        targetDomain: TValue,
        sourceModuleId: number
    ): ModuleSet {
        return this.supportByDomain
            .get(targetDomain)
            ?.get(sourceModuleId)
            ?? new ModuleSet(this.modules.length);
    }
}

// const domain = new DomainBuilder().build(patternDefinition);
// const layout = new LayoutBuilder(parent).build(options);

// for each slot:
//     for each parentDomain of layout.items[slot]:
// slotMask.addSet(domain.getModuleSet(parentDomain))

// for each edge:
//     weight = domain.getTransitionWeight(sourceModuleId, targetModuleId)