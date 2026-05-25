# Chords Warmup

A small chord-progression warmup app with deterministic generation by seed.

## Development

```bash
npm run dev
```

Open [http://localhost:3000/warmup](http://localhost:3000/warmup).

## Structure

- `app/warmup/page.tsx` renders the warmup interface.
- `app/api/progression/route.ts` exposes progression generation.
- `lib/music/generator/` contains deterministic generation logic.
