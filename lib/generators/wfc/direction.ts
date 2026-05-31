export const Direction = {
    Back: 0,
    Forward: 1,
} as const;

export type Direction = typeof Direction[keyof typeof Direction];

export function oppositeDirection(direction: Direction): Direction {
    return direction === Direction.Back
        ? Direction.Forward
        : Direction.Back;
}
