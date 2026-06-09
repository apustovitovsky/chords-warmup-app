import { ModuleSet } from "../runtime/moduleSet";
import { GraphDecoder } from "./graphDecoder";
import type { PatternCollection, PatternDefinition } from "./patternDefinition";

export interface DomainBuild<TValue = string> {
    domain: Domain;
    domainIds: DomainIds<TValue>;
    decoder: GraphDecoder<TValue>;
}

export class Domain {
    constructor(
        readonly modulesByDomainId: ModuleSet[],
        readonly supportsByModuleId: ModuleSet[],
        readonly moduleCapacity: number
    ) { }
}

export class DomainIds<TValue = string> {
    constructor(private readonly domainIdByValue: Map<TValue, number>) { }

    get(domain: TValue): number {
        const domainId = this.domainIdByValue.get(domain);

        if (domainId === undefined) {
            throw new Error(`Unknown domain "${String(domain)}".`);
        }

        return domainId;
    }
}

export class DomainBuilder<TValue = string> {
    build(collection: PatternCollection<TValue>): DomainBuild<TValue> {
        const domains = this.createDomains(collection.patterns);
        const moduleValues = this.createModuleValues(collection.patterns);
        const modulesByDomainId = this.createModulesByDomainId(
            collection.patterns,
            domains,
            moduleValues
        );
        const supportsByModuleId = this.createSupportsByModuleId(
            collection.patterns,
            moduleValues
        );

        return {
            domain: new Domain(
                modulesByDomainId,
                supportsByModuleId,
                moduleValues.length
            ),
            domainIds: new DomainIds(this.createIndex(domains)),
            decoder: new GraphDecoder(moduleValues),
        };
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

    private createModuleValues(
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

    private createModulesByDomainId(
        patterns: PatternDefinition<TValue>[],
        domains: TValue[],
        moduleValues: TValue[]
    ): ModuleSet[] {
        const domainIdByValue = this.createIndex(domains);
        const moduleIdByValue = this.createIndex(moduleValues);
        const result = Array.from(
            { length: domains.length },
            () => new ModuleSet(moduleValues.length)
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
        moduleValues: TValue[]
    ): ModuleSet[] {
        const moduleIdByValue = this.createIndex(moduleValues);
        const result = Array.from(
            { length: moduleValues.length },
            () => new ModuleSet(moduleValues.length)
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

    private createIndex(values: TValue[]): Map<TValue, number> {
        const result = new Map<TValue, number>();

        for (let index = 0; index < values.length; index++) {
            result.set(values[index], index);
        }

        return result;
    }
}
