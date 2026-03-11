# Bitespeed Identity Reconciliation Service

A backend service that identifies and links customer contacts across multiple purchases using email and phone number matching.

## Live Endpoint

> **Base URL**: `https://your-app-name.onrender.com`

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

## Project Structure

```
src/
├── config/db.ts                 # Database pool & table init
├── controllers/identify.controller.ts  # Request validation & response
├── routes/identify.route.ts     # POST /identify route
├── services/identity.service.ts # Core identity reconciliation logic
└── types/contact.types.ts       # TypeScript interfaces
```

## How It Works

1. **New customer** — Creates a `primary` contact row.
2. **Existing customer, new info** — Creates a `secondary` contact linked to the primary.
3. **Two separate primaries linked** — The older one stays `primary`; the newer one is demoted to `secondary` and all its secondaries are re-linked.

## Local Development

### Prerequisites
- Node.js ≥ 18
- Docker (for PostgreSQL)

### Setup

```bash
# Install dependencies
npm install

# Start PostgreSQL via Docker
docker compose up -d

# Create .env file
cp .env.example .env
# Edit DATABASE_URL if needed (default: postgresql://postgres:postgres@localhost:5431/bitespeed)

# Start dev server (hot reload)
npm run dev
```

### Build & Run (production)

```bash
npm run build
npm start
```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5431/bitespeed` |
| `PORT` | Server port (default: 3000) | `3000` |
