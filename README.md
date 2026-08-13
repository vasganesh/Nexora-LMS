# EduVerse LMS

Full-stack learning management prototype with React + Vite frontend and Express + Prisma + PostgreSQL backend.

## Quick start

```bash
npm install
npm run db:setup
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3000/api/health

## Demo accounts (after seed)

| Role    | Email                 | Password      |
|---------|-----------------------|---------------|
| Student | student@eduverse.com  | password123   |
| Teacher | teacher@eduverse.com  | password123   |
| Admin   | admin@eduverse.com    | password123   |

## Scripts

- `npm run dev` — frontend + API together
- `npm run dev:client` — Vite only
- `npm run dev:server` — API only
- `npm run db:setup` — start embedded Postgres, push schema, seed data
- `npm run db:studio` — Prisma Studio

## Database

Uses embedded PostgreSQL by default (stored in `.pgdata`). Alternatively, run Docker Postgres:

```bash
docker compose up -d
```

Then set `DATABASE_URL` in `.env`.

## Repository

https://github.com/Prathisha71/LMS1
