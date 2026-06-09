export type Direction = 0 | 1;

export const Direction = {
    Back: 0,
    Forward: 1,
    count: 2,

    opposite: (direction: Direction): Direction =>
        (1 - direction) as Direction,
} as const;
