import type { PatternCollection, PatternDefinition } from "./patternDefinition";

export interface PatternModule<TValue = string> {
    id: number;
    domainId: number;
    value: TValue;
}

interface ModuleBuildResult<TValue> {
    modules: PatternModule<TValue>[];
    moduleValueIds: number[];
}

export class Domain<TValue = string> {
    constructor(
        readonly domains: TValue[],
        readonly modules: PatternModule<TValue>[],
        readonly moduleIdsByDomainId: number[][],
        private readonly moduleValueIds: number[],
        private readonly valueTransitionWeights: number[][]
    ) { }

    getDomainId(domain: TValue): number {
        const domainId = this.domains.indexOf(domain);

        if (domainId < 0) {
            throw new Error(`Unknown domain "${String(domain)}".`);
        }

        return domainId;
    }

    getTransitionWeight(fromModuleId: number, toModuleId: number): number {
        const fromValueId = this.moduleValueIds[fromModuleId];
        const toValueId = this.moduleValueIds[toModuleId];

        return this.valueTransitionWeights[fromValueId]?.[toValueId] ?? 0;
    }
}

export class DomainBuilder<TValue = string> {
    build(collection: PatternCollection<TValue>): Domain<TValue> {
        const domains = this.createDomains(collection.patterns);
        const values = this.createValues(collection.patterns);
        const moduleResult = this.createModules(
            collection.patterns,
            domains,
            values
        );
        const moduleIdsByDomainId = this.createModuleIdsByDomainId(
            domains,
            moduleResult.modules
        );
        const valueTransitionWeights = this.createValueTransitionWeights(
            collection.patterns,
            values
        );

        return new Domain(
            domains,
            moduleResult.modules,
            moduleIdsByDomainId,
            moduleResult.moduleValueIds,
            valueTransitionWeights
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

    private createValues(
        patterns: PatternDefinition<TValue>[]
    ): TValue[] {
        const values: TValue[] = [];
        const seen = new Set<TValue>();

        for (const pattern of patterns) {
            for (const value of pattern.values) {
                if (seen.has(value)) {
                    continue;
                }

                seen.add(value);
                values.push(value);
            }
        }

        return values;
    }

    private createModules(
        patterns: PatternDefinition<TValue>[],
        domains: TValue[],
        values: TValue[]
    ): ModuleBuildResult<TValue> {
        const modules: PatternModule<TValue>[] = [];
        const moduleValueIds: number[] = [];

        for (const pattern of patterns) {
            for (const domain of pattern.parentValues) {
                const domainId = domains.indexOf(domain);

                for (const value of pattern.values) {
                    if (this.hasModule(modules, domainId, value)) {
                        continue;
                    }

                    modules.push({
                        id: modules.length,
                        domainId,
                        value,
                    });
                    moduleValueIds.push(values.indexOf(value));
                }
            }
        }

        return {
            modules,
            moduleValueIds,
        };
    }

    private createModuleIdsByDomainId(
        domains: TValue[],
        modules: PatternModule<TValue>[]
    ): number[][] {
        const result = Array.from(
            { length: domains.length },
            () => [] as number[]
        );

        for (const module of modules) {
            result[module.domainId].push(module.id);
        }

        return result;
    }

    private createValueTransitionWeights(
        patterns: PatternDefinition<TValue>[],
        values: TValue[]
    ): number[][] {
        const result = Array.from(
            { length: values.length },
            () => new Array(values.length).fill(0)
        );

        for (const pattern of patterns) {
            for (let index = 0; index < pattern.values.length - 1; index++) {
                const fromValueId = values.indexOf(pattern.values[index]);
                const toValueId = values.indexOf(pattern.values[index + 1]);

                result[fromValueId][toValueId]++;
            }
        }

        return result;
    }

    private hasModule(
        modules: PatternModule<TValue>[],
        domainId: number,
        value: TValue
    ): boolean {
        return modules.some((module) =>
            module.domainId === domainId &&
            module.value === value
        );
    }
}
