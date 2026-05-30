export const Direction = {
    Previous: 0,
    Next: 1,
} as const;

export type Direction = typeof Direction[keyof typeof Direction];

export function oppositeDirection(direction: Direction): Direction {
    return direction === Direction.Previous
        ? Direction.Next
        : Direction.Previous;
}
