import { ModuleSet } from "../runtime/moduleSet";
import type { PatternCollection, PatternDefinition } from "./patternDefinition";

export interface PatternModule<TValue = string> {
    id: number;
    value: TValue;
}

export class Domain<TValue = string> {
    private readonly domainIdByValue = new Map<TValue, number>();

    constructor(
        readonly domains: TValue[],
        readonly modules: PatternModule<TValue>[],
        readonly modulesByDomainId: ModuleSet[],
        readonly supportsByModuleId: ModuleSet[]
    ) {
        for (let domainId = 0; domainId < this.domains.length; domainId++) {
            this.domainIdByValue.set(this.domains[domainId], domainId);
        }
    }

    getDomainId(domain: TValue): number {
        const domainId = this.domainIdByValue.get(domain);

        if (domainId === undefined) {
            throw new Error(`Unknown domain "${String(domain)}".`);
        }

        return domainId;
    }
}

export class DomainBuilder<TValue = string> {
    build(collection: PatternCollection<TValue>): Domain<TValue> {
        const domains = this.createDomains(collection.patterns);
        const modules = this.createModules(collection.patterns);
        const modulesByDomainId = this.createModulesByDomainId(
            collection.patterns,
            domains,
            modules
        );
        const supportsByModuleId = this.createSupportsByModuleId(
            collection.patterns,
            modules
        );

        return new Domain(
            domains,
            modules,
            modulesByDomainId,
            supportsByModuleId
        );
    }

    private createDomains(
        patterns: PatternDefinition<TValue>[]
    ): TValue[] {
        const domains: TValue[] = [];
        const seen = new Set<TValue>();

        for (const pattern of patterns) {
            for (const domain of pattern.parentValues) {
                if (seen.has(domain)) {
                    continue;
                }

                seen.add(domain);
                domains.push(domain);
            }
        }

        return domains;
    }

    private createModules(
        patterns: PatternDefinition<TValue>[]
    ): PatternModule<TValue>[] {
        const modules: PatternModule<TValue>[] = [];
        const seen = new Set<TValue>();

        for (const pattern of patterns) {
            for (const value of pattern.values) {
                if (seen.has(value)) {
                    continue;
                }

                seen.add(value);
                modules.push({
                    id: modules.length,
                    value,
                });
            }
        }

        return modules;
    }

    private createModulesByDomainId(
        patterns: PatternDefinition<TValue>[],
        domains: TValue[],
        modules: PatternModule<TValue>[]
    ): ModuleSet[] {
        const domainIdByValue = this.createIndex(domains);
        const moduleIdByValue = this.createModuleIndex(modules);
        const result = Array.from(
            { length: domains.length },
            () => new ModuleSet(modules.length)
        );

        for (const pattern of patterns) {
            for (const domain of pattern.parentValues) {
                const domainId = domainIdByValue.get(domain);

                if (domainId === undefined) {
                    throw new Error(`Unknown domain "${String(domain)}".`);
                }

                const domainModules = result[domainId];

                for (const value of pattern.values) {
                    domainModules.add(this.getModuleId(moduleIdByValue, value));
                }
            }
        }

        return result;
    }

    private createSupportsByModuleId(
        patterns: PatternDefinition<TValue>[],
        modules: PatternModule<TValue>[]
    ): ModuleSet[] {
        const moduleIdByValue = this.createModuleIndex(modules);
        const result = Array.from(
            { length: modules.length },
            () => new ModuleSet(modules.length)
        );

        for (const pattern of patterns) {
            for (let index = 0; index < pattern.values.length - 1; index++) {
                const fromModuleId = this.getModuleId(
                    moduleIdByValue,
                    pattern.values[index]
                );
                const toModuleId = this.getModuleId(
                    moduleIdByValue,
                    pattern.values[index + 1]
                );

                result[fromModuleId].add(toModuleId);
                result[toModuleId].add(fromModuleId);
            }
        }

        return result;
    }

    private getModuleId(
        moduleIdByValue: Map<TValue, number>,
        value: TValue
    ): number {
        const moduleId = moduleIdByValue.get(value);

        if (moduleId === undefined) {
            throw new Error(`Unknown module value "${String(value)}".`);
        }

        return moduleId;
    }

    private createModuleIndex(
        modules: PatternModule<TValue>[]
    ): Map<TValue, number> {
        const result = new Map<TValue, number>();

        for (const module of modules) {
            result.set(module.value, module.id);
        }

        return result;
    }

    private createIndex(values: TValue[]): Map<TValue, number> {
        const result = new Map<TValue, number>();

        for (let index = 0; index < values.length; index++) {
            result.set(values[index], index);
        }

        return result;
    }
}
