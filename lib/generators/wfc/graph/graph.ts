export interface GraphNode<TPayload> {
    id: number;
    payload: TPayload;
}

export interface GraphEdge {
    from: number;
    to: number;
}

export class Graph<TPayload> {
    constructor(
        readonly nodes: GraphNode<TPayload>[],
        readonly edges: GraphEdge[]
    ) { }

    get rootNode(): GraphNode<TPayload> | null {
        return this.nodes[0] ?? null;
    }

    getChildNodes(nodeId: number): GraphNode<TPayload>[] {
        return this.edges
            .filter((edge) => edge.from === nodeId)
            .map((edge) => this.nodes[edge.to]);
    }

    getParentNodes(nodeId: number): GraphNode<TPayload>[] {
        return this.edges
            .filter((edge) => edge.to === nodeId)
            .map((edge) => this.nodes[edge.from]);
    }

    getLeafNodes(nodeId: number): GraphNode<TPayload>[] {
        return this.getDescendantNodes(nodeId)
            .filter((node) => this.getChildNodes(node.id).length === 0);
    }

    getDescendantNodes(nodeId: number): GraphNode<TPayload>[] {
        const result: GraphNode<TPayload>[] = [];

        for (const child of this.getChildNodes(nodeId)) {
            result.push(child);
            result.push(...this.getDescendantNodes(child.id));
        }

        return result;
    }

    getLeafIds(nodeId: number): number[] {
        return this.getLeafNodes(nodeId).map((node) => node.id);
    }
}
