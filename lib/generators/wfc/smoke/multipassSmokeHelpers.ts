import { CollapseSolver } from "../runtime/collapseSolver";
import { DomainBuilder, type DomainBuild } from "../multipass/domainBuilder";
import { GraphBuilder } from "../multipass/graphBuilder";
import { LayoutBuilder, type LayoutBuilderOptions } from "../multipass/layoutBuilder";
import type { PatternCollection } from "../multipass/patternDefinition";
import type { RuntimeGraph } from "../runtime/runtimeGraph";
import type { ModuleSet } from "../runtime/moduleSet";

export interface PassGraph<TValue = string> {
    domainBuild: DomainBuild<TValue>;
    graph: RuntimeGraph;
}

export interface SolvedPassGraph<TValue = string> extends PassGraph<TValue> {
    collapsed: TValue[];
}

export function createPassGraph<TValue = string>(
    collection: PatternCollection<TValue>,
    parentValues: TValue[],
    options: LayoutBuilderOptions
): PassGraph<TValue> {
    const domainBuild = new DomainBuilder<TValue>().build(collection);
    const parentDomainIds = parentValues.map((value) =>
        domainBuild.domainIds.get(value)
    );
    const layout = new LayoutBuilder(parentDomainIds).build(options);
    const graph = new GraphBuilder().build(layout, domainBuild.domain);

    return {
        domainBuild,
        graph,
    };
}

export function solvePassGraph<TValue = string>(
    passGraph: PassGraph<TValue>
): TValue[] {
    new CollapseSolver(passGraph.graph).solve();

    return passGraph.domainBuild.decoder.decode(passGraph.graph);
}

export function buildPassGraph<TValue = string>(
    collection: PatternCollection<TValue>,
    parentValues: TValue[],
    options: LayoutBuilderOptions
): SolvedPassGraph<TValue> {
    const passGraph = createPassGraph(collection, parentValues, options);

    return {
        ...passGraph,
        collapsed: solvePassGraph(passGraph),
    };
}

export function printGraphDomains<TValue = string>(
    title: string,
    passGraph: PassGraph<TValue>
): void {
    console.log(`\n${green(title)}`);

    for (
        let nodeIndex = 0;
        nodeIndex < passGraph.graph.nodes.length;
        nodeIndex++
    ) {
        const node = passGraph.graph.nodes[nodeIndex];

        console.log(
            `  ${dim(`${nodeIndex}.`)} ${formatModuleSet(passGraph.domainBuild, node.modules)}`
        );
    }
}

export function printValues<TValue = string>(
    title: string,
    values: TValue[]
): void {
    console.log(`\n${green(title)}`);

    for (let index = 0; index < values.length; index++) {
        console.log(`  ${dim(`${index}.`)} ${gold(values[index])}`);
    }
}

export function formatModuleSet<TValue = string>(
    domainBuild: DomainBuild<TValue>,
    modules: ModuleSet
): string {
    return formatModuleIds(domainBuild, modules.toIds());
}

export function formatModuleIds<TValue = string>(
    domainBuild: DomainBuild<TValue>,
    moduleIds: number[]
): string {
    return moduleIds
        .map((moduleId) => formatModuleLabel(domainBuild, moduleId))
        .join(", ") || red("-");
}

export function formatModuleLabel<TValue = string>(
    domainBuild: DomainBuild<TValue>,
    moduleId: number
): string {
    return `${gold(domainBuild.decoder.formatModule(moduleId))}${dim(`:${moduleId}`)}`;
}

export function getModuleIdByValue<TValue = string>(
    domainBuild: DomainBuild<TValue>,
    modules: ModuleSet,
    value: TValue
): number {
    for (const moduleId of modules) {
        if (domainBuild.decoder.getModuleValue(moduleId) === value) {
            return moduleId;
        }
    }

    const fallbackModuleId = modules.toIds()[0];

    if (fallbackModuleId === undefined) {
        throw new Error("Cannot select module from empty node.");
    }

    return fallbackModuleId;
}

export function green(text: string): string {
    return `\x1b[32m${text}\x1b[0m`;
}

export function cyan(text: string): string {
    return `\x1b[36m${text}\x1b[0m`;
}

export function gold(value: unknown): string {
    return `\x1b[33m${String(value)}\x1b[0m`;
}

export function red(text: string): string {
    return `\x1b[31m${text}\x1b[0m`;
}

export function dim(text: string): string {
    return `\x1b[90m${text}\x1b[0m`;
}
