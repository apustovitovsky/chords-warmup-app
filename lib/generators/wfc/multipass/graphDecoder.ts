import type { RuntimeGraph } from "../runtime/runtimeGraph";

export class GraphDecoder<TValue = string> {
    constructor(private readonly moduleValues: TValue[]) { }

    decode(graph: RuntimeGraph): TValue[] {
        return graph.nodes.map((node, nodeIndex) => {
            const moduleId = node.resolvedModuleId;

            if (moduleId === null) {
                throw new Error(`Cannot decode unresolved node "${nodeIndex}".`);
            }

            return this.getModuleValue(moduleId);
        });
    }

    getModuleValue(moduleId: number): TValue {
        const value = this.moduleValues[moduleId];

        if (value === undefined) {
            throw new Error(`Unknown module "${moduleId}".`);
        }

        return value;
    }

    formatModule(moduleId: number): string {
        return String(this.getModuleValue(moduleId));
    }
}
