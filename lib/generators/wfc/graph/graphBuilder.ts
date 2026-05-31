import { Graph, type GraphEdge, type GraphNode } from "./graph";

export class GraphBuilder<TPayload> {
    private readonly nodes: GraphNode<TPayload>[] = [];
    private readonly edges: GraphEdge[] = [];

    createNode(payload: TPayload): number {
        const id = this.nodes.length;
        this.nodes.push({ id, payload });

        return id;
    }

    createEdge(from: number, to: number): void {
        this.edges.push({ from, to });
    }

    getOrCreateChildNode(parentId: number, payload: TPayload): number {
        const existingEdge = this.edges.find((edge) => {
            if (edge.from !== parentId) {
                return false;
            }

            return this.nodes[edge.to]?.payload === payload;
        });

        if (existingEdge) {
            return existingEdge.to;
        }

        const childId = this.createNode(payload);
        this.createEdge(parentId, childId);

        return childId;
    }

    build(): Graph<TPayload> {
        return new Graph(this.nodes, this.edges);
    }
}