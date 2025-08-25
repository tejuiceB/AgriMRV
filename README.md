# Agro MRV Project

A full-stack application for agricultural monitoring, reporting, and verification using Next.js, Node API, and PostgreSQL.

## Overview

This application provides a platform for:
1. **Users (farmers, auditors, carbon registries)** to register and authenticate
2. **Projects (agroforestry/rice fields)** to be registered for MRV
3. **Measurements (tree height, canopy, biomass, carbon stock)** to be recorded
4. **Verification & Reporting** with audit trail and blockchain hash references

## Project Structure

```
agro-mrv/
  apps/
    web/        # Next.js (frontend)
    api/        # Node API (Express)
  prisma/       # Prisma schema & migrations (single DB for both apps)
  .env.example
  docker-compose.yml
  package.json
  README.md
```

## Prerequisites

* Node 18+ (use `nvm`)
* pnpm (`npm i -g pnpm`)
* PostgreSQL server (with pgAdmin)
* Git

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd agro-mrv
pnpm install
```

### 2. Database Setup

Ensure your local PostgreSQL server is running and accessible through pgAdmin.
Create a database named `agromrv` if it doesn't exist.

### 3. Apply Database Migrations

```bash
cp .env.example .env
pnpm dlx prisma migrate dev --name init
```

Enable PostGIS (optional):
```bash
# Using pgAdmin, run this SQL on the agromrv database:
CREATE EXTENSION IF NOT EXISTS postgis;
```

### 4. Install API Dependencies

```bash
pnpm -C apps/api add express zod cors dotenv
pnpm -C apps/api add -D typescript ts-node-dev @types/express @types/node @types/cors
pnpm -C apps/api add @prisma/client
```

### 5. Setup Next.js Frontend

```bash
pnpm dlx create-next-app@latest apps/web --typescript --eslint --app --tailwind --src-dir --import-alias "@/*"
```

Add `.env.local` to `apps/web` folder:
```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 6. Start Development Servers

In separate terminals:

```bash
# Start API server
pnpm -C apps/api dev

# Start Next.js server
pnpm -C apps/web dev
```

Visit:
- Frontend: http://localhost:3000
- API: http://localhost:4000/healthz

## Development Commands

```bash
# Start all services in parallel
pnpm dev

# Build all apps
pnpm build

# Lint all apps
pnpm lint

# Database commands
pnpm db:studio   # Open Prisma Studio
```

## Database Schema

The application uses a PostgreSQL database with the following schema:

```sql
-- Users (farmers, auditors, registry)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(50) CHECK (role IN ('farmer','auditor','registry')),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Agroforestry / Rice Projects
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    project_name VARCHAR(150),
    latitude FLOAT,
    longitude FLOAT,
    crop_type VARCHAR(100),
    start_date DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Measurements (from drone/phone/IoT device)
CREATE TABLE measurements (
    id SERIAL PRIMARY KEY,
    project_id INT REFERENCES projects(id),
    tree_height FLOAT,
    canopy_cover FLOAT,
    biomass_estimate FLOAT,
    carbon_stock FLOAT,
    captured_at TIMESTAMP DEFAULT NOW()
);

-- Blockchain Verification Records
CREATE TABLE blockchain_records (
    id SERIAL PRIMARY KEY,
    measurement_id INT REFERENCES measurements(id),
    tx_hash VARCHAR(200), -- blockchain transaction hash
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints

The API provides the following endpoints:

### Users
- `GET /api/users` - List all users
- `GET /api/users/:id` - Get a specific user
- `POST /api/users` - Create a new user
- `PUT /api/users/:id` - Update a user
- `DELETE /api/users/:id` - Delete a user

### Projects
- `GET /api/projects` - List all projects
- `GET /api/projects/:id` - Get a specific project with its measurements
- `POST /api/projects` - Create a new project
- `PUT /api/projects/:id` - Update a project
- `DELETE /api/projects/:id` - Delete a project

### Measurements
- `GET /api/measurements` - List all measurements
- `GET /api/measurements/:id` - Get a specific measurement with its blockchain records
- `POST /api/measurements` - Create a new measurement
- `PUT /api/measurements/:id` - Update a measurement
- `DELETE /api/measurements/:id` - Delete a measurement

### Blockchain Verification
- `GET /api/verify` - List all blockchain verification records
- `GET /api/verify/:id` - Get a specific blockchain record
- `POST /api/verify` - Create a new blockchain verification record
- `PUT /api/verify/:id` - Update a blockchain record
- `DELETE /api/verify/:id` - Delete a blockchain record

## Future Enhancements

* PostGIS integration for proper geospatial features
* Authentication and per-farmer tenancy
* File uploads for imagery and photogrammetry processing
* Blockchain integration for verifying carbon credits
* Mobile app for field data collection
