import type { SectionDefinition } from "./sectionDefinition";

export function toSectionDefinition(
    section: GraphSectionDefinition
): SectionDefinition {
    return {
        tags: [getGraphConstraintId(section)],
        length: section.length,
    };
}

export interface GraphSectionDefinition {
    patternTag: string;
    sectionTag: string;
    length: number;
}

export function getGraphConstraintId(
    section: Pick<GraphSectionDefinition, "patternTag" | "sectionTag">
): string {
    return `${section.patternTag}:${section.sectionTag}`;
}

