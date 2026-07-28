# RoomSketch

Draw a floor plan. Walk the home before it's built.

RoomSketch is a browser-based floor plan editor with a live, synced 3D preview — draw walls, doors, windows and stairs on a 2D canvas and watch the 3D model update instantly, no re-modeling required.

## Features

- **Node-based floor plan editor** — real-metre units, with solid, railing, and open wall types per segment
- **Live 3D model** — a resizable split view keeps the 2D plan and 3D scene in sync as you draw
- **Materials** — 60+ materials across walls, floors, doors and furniture, applied per room
- **Walk Mode** — first-person camera at eye level, plus Orbit and Top-down views
- **Duplicate & undo** — mirror or duplicate rooms/furniture groups; every edit is undoable
- **Share links** — send a client a link to open the model on any device, no plugin required

## Tech stack

- [Next.js](https://nextjs.org/) (App Router)
- TypeScript
- Tailwind CSS
- [Supabase](https://supabase.com/) — auth and waitlist storage

## Getting started

### Prerequisites

- Node.js 18+
- A Supabase project

### Installation

```bash
git clone <your-repo-url>
cd roomsketch
npm install
```

### Environment variables

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

| Variable                    | Description                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_WAITLIST_MODE` | `true` shows the waitlist form and swaps CTAs site-wide; `false` shows the normal product  |
| `NEXT_PUBLIC_SUPABASE_URL`  | Your Supabase project URL                                                                  |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only Supabase key, used by the waitlist API route — never expose this to the client |
| `NEXT_PUBLIC_SITE_URL`      | Canonical site URL, used for SEO metadata (OG/Twitter images, canonical link)              |

### Database

If waitlist mode is enabled, create the `waitlist` table in Supabase:

```sql
create table waitlist (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  source text,
  created_at timestamptz default now()
);
```

Keep Row Level Security **on** with no public policies — the API route writes with the service role key, which bypasses RLS, so the anon key never needs direct table access.

### Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Type checking

```bash
npx tsc --noEmit
```

### Build

```bash
npm run build
```

## License

_Add your license here._
