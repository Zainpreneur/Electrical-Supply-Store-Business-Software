# ⚡ ElectroSupply — Electrical Supply Store Business Software

A full-stack business management application for an electrical supply store:
inventory & stock control, supplier purchase orders, point-of-sale (POS)
checkout, customer accounts & invoicing, and sales/inventory reporting.

## Stack

| Layer     | Technology |
|-----------|------------|
| Frontend  | React 18 + TypeScript + Vite + Tailwind CSS + React Router + Recharts |
| Backend   | Node.js + Express + TypeScript |
| Database  | SQLite via Prisma ORM (swap the `DATABASE_URL` for Postgres/MySQL in production with no code changes) |
| Auth      | JWT (JSON Web Tokens) + bcrypt password hashing, role-based access control |

## Features

- **Auth & Roles** — Admin / Manager / Staff roles with route- and API-level
  permission checks. Admins manage user accounts.
- **Product & Inventory Management** — SKU, category, brand, unit, cost/sell
  price, stock quantity, reorder level; manual stock adjustments with a full
  audit trail (`StockMovement`).
- **Categories & Suppliers** — organize the catalog and vendor directory.
- **Purchase Orders** — create POs against a supplier, then "Receive" them to
  automatically add stock and record the cost per unit.
- **Point of Sale (POS)** — searchable product grid, cart, discounts, tax,
  multiple payment methods, partial payments, walk-in or registered
  customers. Stock is decremented transactionally on checkout and restored if
  a sale is voided.
- **Customers** — customer directory with live outstanding balance per
  customer (sum of unpaid/partial invoices).
- **Sales History & Invoicing** — view invoices, record additional payments
  against partially-paid invoices, void sales (Admin/Manager).
- **Dashboard** — today's revenue, month-to-date revenue, inventory value,
  low-stock alert count, recent sales, and a low-stock chart.
- **Reports** — sales summary (revenue, cost of goods, gross profit,
  outstanding balance, top products) for a date range, full inventory
  valuation, and a dedicated low-stock report.

## Project Structure

```
server/                Express + TypeScript API
  prisma/schema.prisma  Data model (SQLite)
  prisma/seed.ts         Demo data seeding script
  src/routes/            One router module per resource
  src/middleware/         Auth (JWT) + centralized error handling
client/                React + Vite + TypeScript SPA
  src/pages/              One page per feature area
  src/components/         Shared UI (Layout, Modal, StatCard, …)
  src/context/AuthContext.tsx
  src/api/                Axios client + shared TS types
```

## Getting Started

Requires Node.js 18+.

### 1. Backend

```bash
cd server
cp .env.example .env      # defaults are fine for local dev
npm install
npx prisma migrate dev    # creates SQLite db + applies schema (auto-seeds too)
npm run dev                # http://localhost:4000
```

To reseed demo data at any time: `npm run seed` (safe to re-run; uses upserts
where practical).

### 2. Frontend

In a second terminal:

```bash
cd client
npm install
npm run dev                # http://localhost:5173
```

The Vite dev server proxies `/api/*` to `http://localhost:4000`, so just open
http://localhost:5173.

### Demo Logins

| Role  | Email | Password |
|-------|-------|----------|
| Admin | admin@electrosupply.com | admin123 |
| Staff | staff@electrosupply.com | staff123 |

### Production build

```bash
# backend
cd server && npm run build && npm run start

# frontend
cd client && npm run build   # outputs static assets to client/dist
```

Serve `client/dist` with any static host (Nginx, Vercel, Netlify, etc.) and
point it at the deployed API, or serve it from the Express app behind a
reverse proxy.

## Data Model Overview

- `User` — staff accounts (ADMIN / MANAGER / STAFF)
- `Category`, `Supplier`, `Product` — catalog
- `StockMovement` — audit trail of every stock change (IN / OUT / ADJUSTMENT)
- `Customer`
- `Sale` + `SaleItem` — POS invoices; `status` is PAID / PARTIAL / UNPAID
- `PurchaseOrder` + `PurchaseOrderItem` — supplier orders; `status` is DRAFT /
  ORDERED / RECEIVED / CANCELLED

SQLite has no native enum type, so role/status/type columns are plain
strings constrained by the Zod validation schemas in each route module (see
the comment at the top of `server/prisma/schema.prisma`).

## API Overview

All endpoints are under `/api` and (except `/api/auth/login` and
`/api/health`) require `Authorization: Bearer <token>`.

- `POST /api/auth/login`, `GET /api/auth/me`
- `GET/POST/PUT/DELETE /api/users` (Admin only)
- `GET/POST/PUT/DELETE /api/categories`
- `GET/POST/PUT/DELETE /api/suppliers`
- `GET/POST/PUT /api/products`, `POST /api/products/:id/adjust-stock`
- `GET/POST /api/purchase-orders`, `POST /api/purchase-orders/:id/receive`,
  `POST /api/purchase-orders/:id/cancel`
- `GET/POST/PUT/DELETE /api/customers`
- `GET/POST /api/sales`, `POST /api/sales/:id/payments`,
  `POST /api/sales/:id/void`
- `GET /api/reports/dashboard`, `/api/reports/sales-summary`,
  `/api/reports/inventory-valuation`, `/api/reports/low-stock`

## Notes & Next Steps

This is a solid, working MVP intended to be extended. Natural next steps for
a production deployment:

- Swap SQLite for Postgres (`datasource db { provider = "postgresql" }` in
  `schema.prisma`, update `DATABASE_URL`) — no application code changes
  needed.
- Add printable/PDF invoice generation.
- Add barcode scanning support in the POS product search.
- Add refresh tokens / shorter-lived access tokens for production auth.
- Add pagination to list endpoints once catalogs grow large.
