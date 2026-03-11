# Bitespeed Identity Reconciliation Service

A backend service that identifies and links customer contacts across multiple purchases using email and phone number matching.

## Live Endpoint

> **Base URL**: `https://bitespeed-3ohx.onrender.com/`

```
POST /identify
```

**Request body** (JSON):
```json
{
  "email": "example@domain.com",
  "phoneNumber": "123456"
}
```

At least one of `email` or `phoneNumber` must be provided.

**Response** (HTTP 200):
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["lorraine@hillvalley.edu", "mcfly@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": [2]
  }
}
```

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (via `pg`)
- **Validation**: Zod
- **Containerisation**: Docker + Docker Compose

## Project Structure

```
src/
├── config/db.ts                        # Database pool, indexes & table init
├── controllers/identify.controller.ts  # Request validation & response
├── routes/identify.route.ts            # POST /identify route
├── services/identity.service.ts        # Core identity reconciliation logic
├── types/contact.types.ts              # TypeScript interfaces
└── validators/identify.validator.ts    # Zod request schema
```

## How It Works

1. **New customer** — Creates a `primary` contact row.
2. **Existing customer, new info** — Creates a `secondary` contact linked to the primary.
3. **Two separate primaries linked** — The older one stays `primary`; the newer one is demoted to `secondary` and all its secondaries are re-linked.

---

## Getting Started

### Option 1: Docker (Recommended)

Run the entire stack (app + PostgreSQL) with a single command — no local installs needed.

**Prerequisites**: Docker & Docker Compose

```bash
# Build and start everything
docker compose up --build

# App will be available at http://localhost:5000
# Postgres at localhost:5431
```

To stop:
```bash
docker compose down
```

To stop **and** wipe the database:
```bash
docker compose down -v
```

---

### Option 2: Local (npm)

Run the app directly on your machine with hot-reload for development.

**Prerequisites**: Node.js ≥ 18, Docker (for PostgreSQL only)

```bash
# 1. Install dependencies
npm install

# 2. Start PostgreSQL via Docker
docker compose up postgres -d

# 3. Create .env file
cp .env.example .env
# Default: DATABASE_URL=postgresql://postgres:postgres@localhost:5431/bitespeed

# 4. Start dev server (hot reload)
npm run dev
# App will be available at http://localhost:3000
```

### Build for Production (local)

```bash
npm run build
npm start
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5431/bitespeed` |
| `PORT` | Server port | `3000` (local) / `5000` (Docker) |

## API Examples

```bash
# Create a new contact
curl -X POST http://localhost:5000/identify \
  -H 'Content-Type: application/json' \
  -d '{"email":"lorraine@hillvalley.edu","phoneNumber":"123456"}'

# Link with new email
curl -X POST http://localhost:5000/identify \
  -H 'Content-Type: application/json' \
  -d '{"email":"mcfly@hillvalley.edu","phoneNumber":"123456"}'

# Query by phone only
curl -X POST http://localhost:5000/identify \
  -H 'Content-Type: application/json' \
  -d '{"phoneNumber":"123456"}'

# Health check
curl http://localhost:5000/health
```

---

## Future Improvements

For large-scale identity resolution in an enterprise setting, the following architectural upgrades would be considered:

- **Distributed Identity Graph**: Sharding contact data across multiple database nodes based on a consistent hashing ring.
- **Caching Layer (Redis)**: Caching resolved primary-secondary graphs in Redis to avoid re-computing identity trees for frequent shoppers.
- **Event-Driven Identity Merging**: Emitting identity-merge events (e.g., via Kafka) to allow downstream microservices (marketing, analytics) to asynchronously update their references rather than doing heavy synchronised writes.
- **Graph Database**: Migrating from PostgreSQL to a native Graph DB (like Neo4j or Amazon Neptune) when the depth of secondary-to-primary and secondary-to-secondary relations grows too large for efficient SQL recursive queries.
