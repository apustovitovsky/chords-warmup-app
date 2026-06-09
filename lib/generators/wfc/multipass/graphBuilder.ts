import { ModuleSet } from "../runtime/moduleSet";
import { Direction } from "../runtime/direction";
import { RuntimeGraph } from "../runtime/runtimeGraph";
import { RuntimeNode, type RuntimeNeighbor } from "../runtime/runtimeNode";
import type { Domain } from "./domainBuilder";
import type { Layout } from "./layoutBuilder";

export class GraphBuilder {
    build(layout: Layout, domain: Domain): RuntimeGraph {
        const nodeModules = this.createNodeModules(domain, layout);
        const nodes = nodeModules.map((modules, nodeIndex) => new RuntimeNode(
            modules,
            this.createNeighbors(domain, nodeModules, nodeIndex)
        ));
        const graph = new RuntimeGraph(
            nodes,
            nodes.map((_, nodeIndex) => nodeIndex),
            domain.moduleCapacity
        );

        this.initializeModuleHealth(graph);

        return graph;
    }

    private createNodeModules(
        domain: Domain,
        layout: Layout
    ): ModuleSet[] {
        return Array.from(
            { length: layout.items.length },
            (_, nodeIndex) => {
                const modules = new ModuleSet(domain.moduleCapacity);

                for (const domainId of layout.items[nodeIndex]) {
                    modules.addSet(domain.modulesByDomainId[domainId]);
                }

                if (modules.empty) {
                    throw new Error(`Pattern pass produced empty domain for node "${nodeIndex}".`);
                }

                return modules;
            }
        );
    }

    private createNeighbors(
        domain: Domain,
        nodeModules: ModuleSet[],
        nodeIndex: number
    ): Array<RuntimeNeighbor | null> {
        return [
            this.createNeighbor(domain, nodeModules, nodeIndex, Direction.Back),
            this.createNeighbor(domain, nodeModules, nodeIndex, Direction.Forward),
        ];
    }

    private createNeighbor(
        domain: Domain,
        nodeModules: ModuleSet[],
        nodeIndex: number,
        direction: Direction
    ): RuntimeNeighbor | null {
        const targetNodeIndex = direction === Direction.Back
            ? nodeIndex - 1
            : nodeIndex + 1;

        if (
            targetNodeIndex < 0 ||
            targetNodeIndex >= nodeModules.length
        ) {
            return null;
        }

        return {
            nodeIndex: targetNodeIndex,
            supportedModules: this.createSupportedModules(
                domain,
                direction,
                nodeModules[nodeIndex],
                nodeModules[targetNodeIndex]
            ),
        };
    }

    private createSupportedModules(
        domain: Domain,
        direction: Direction,
        sourceModules: ModuleSet,
        targetModules: ModuleSet
    ): ModuleSet[] {
        const modules = this.createEmptyModuleSets(domain.moduleCapacity);

        for (const moduleId of sourceModules) {
            const supported = modules[moduleId];
            supported.addSet(domain.supportsByDirection[direction][moduleId]);
            supported.enforce(targetModules);
        }

        return modules;
    }

    private createEmptyModuleSets(moduleCapacity: number): ModuleSet[] {
        const result: ModuleSet[] = [];

        for (let moduleId = 0; moduleId < moduleCapacity; moduleId++) {
            result[moduleId] = new ModuleSet(moduleCapacity);
        }

        return result;
    }

    private initializeModuleHealth(graph: RuntimeGraph): void {
        for (let nodeIndex = 0; nodeIndex < graph.nodes.length; nodeIndex++) {
            const node = graph.nodes[nodeIndex];

            for (
                let direction = 0;
                direction < Direction.count;
                direction++
            ) {
                const neighbor = node.neighbors[direction];

                if (!neighbor) {
                    continue;
                }

                const targetNode = graph.nodes[neighbor.nodeIndex];

                for (const moduleId of node.modules) {
                    let health = 0;

                    for (const targetModuleId of targetNode.modules) {
                        if (neighbor.supportedModules[moduleId].contains(targetModuleId)) {
                            health++;
                        }
                    }

                    node.setModuleHealth(direction, moduleId, health);
                }
            }
        }
    }
}
