# Architecture: FSD Light

Use a lightweight Feature-Sliced Design structure for application code.

- Keep `app/` focused on Next.js routing files such as `page.tsx`, `layout.tsx`, and `route.ts`.
- Place feature-specific UI and behavior in `features/<feature>/`.
- Keep generated shadcn primitives in `components/ui/` rather than moving them into feature slices.
- Keep shared utilities and reusable domain logic in `lib/` until a clear feature boundary requires moving them.
- Name React component files and exports in `PascalCase`; keep Next.js special filenames lowercase.
- Prefer incremental FSD extraction: do not introduce empty layers, barrel files, or abstractions before they are needed.
