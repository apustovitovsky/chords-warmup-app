export interface PatternCollection<TValue = string> {
    name: string;
    patterns: PatternDefinition<TValue>[];
}

export interface PatternDefinition<TValue = string> {
    parentValues: TValue[];
    values: TValue[];
}
