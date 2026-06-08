export interface GraphNode<TPayload> {
    id: number;
    payload: TPayload;
}

export interface GraphEdge {
    from: number;
    to: number;
}

export class Graph<TPayload> {
    private readonly childrenByNodeId: number[][];
    private readonly parentsByNodeId: number[][];

    constructor(
        readonly nodes: GraphNode<TPayload>[],
        readonly edges: GraphEdge[]
    ) {
        this.childrenByNodeId = nodes.map(() => []);
        this.parentsByNodeId = nodes.map(() => []);

        for (const edge of edges) {
            this.childrenByNodeId[edge.from].push(edge.to);
            this.parentsByNodeId[edge.to].push(edge.from);
        }
    }

    get rootNode(): GraphNode<TPayload> | null {
        return this.nodes[0] ?? null;
    }

    getChildNodeIds(nodeId: number): number[] {
        return this.childrenByNodeId[nodeId] ?? [];
    }

    getChildNodes(nodeId: number): GraphNode<TPayload>[] {
        return this.getChildNodeIds(nodeId)
            .map((childId) => this.nodes[childId]);
    }

    getParentNodeIds(nodeId: number): number[] {
        return this.parentsByNodeId[nodeId] ?? [];
    }

    getParentNodes(nodeId: number): GraphNode<TPayload>[] {
        return this.getParentNodeIds(nodeId)
            .map((parentId) => this.nodes[parentId]);
    }

    getLeafNodes(nodeId: number): GraphNode<TPayload>[] {
        return this.getLeafNodeIds(nodeId)
            .map((leafNodeId) => this.nodes[leafNodeId]);
    }

    getLeafNodeIds(nodeId: number): number[] {
        return this.getDescendantNodeIds(nodeId)
            .filter((descendantNodeId) =>
                this.getChildNodeIds(descendantNodeId).length === 0
            );
    }

    getDescendantNodes(nodeId: number): GraphNode<TPayload>[] {
        return this.getDescendantNodeIds(nodeId)
            .map((descendantNodeId) => this.nodes[descendantNodeId]);
    }

    getDescendantNodeIds(nodeId: number): number[] {
        const result: number[] = [];

        for (const childId of this.getChildNodeIds(nodeId)) {
            result.push(childId);
            result.push(...this.getDescendantNodeIds(childId));
        }

        return result;
    }
}
