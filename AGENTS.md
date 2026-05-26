# Architecture: FSD Light

Use a lightweight Feature-Sliced Design structure.

- `app/` contains routing and application composition, such as providers and the Redux store.
- `features/<feature>/` contains feature-specific UI, state, and behavior.
- `components/ui/` contains reusable shadcn-based UI primitives.
- `lib/` contains shared utilities and reusable domain logic independent of features.

Keep dependencies directed downward: `app -> features -> components/ui | lib`.
`lib/` and `components/ui/` must not depend on `features/` or `app/`, and features must not import other features directly.

Add layers or abstractions only when a real boundary requires them.
