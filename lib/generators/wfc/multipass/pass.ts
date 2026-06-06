export interface PatternPass<TValue = string> {
    name: string;
    patterns: PatternDefinition<TValue>[];
    targetSize?: number;
    domainOverlap?: number;
}

export interface PatternDefinition<TValue = string> {
    parentValues: TValue[] | null;
    values: PatternItem<TValue>[];
}

export interface PatternItem<TValue = string> {
    value: TValue;
    size: number;
}

export interface CollapsedPassItem<TValue = string> {
    value: TValue;
    size: number;
    startIndex: number;
    endIndex: number;
}

export interface CollapsedPass<TValue = string> {
    name: string;
    items: CollapsedPassItem<TValue>[];
}
