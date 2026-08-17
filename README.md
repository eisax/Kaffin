# Kaffin

**Kaffin** is a centralized web-based control plane for orchestrating and managing multi-tenant Odoo installations across multiple Linux servers.

---

## Architecture Overview

```text
                               USERS
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │   Next.js Frontend    │
                     │ (TypeScript, Tailwind)│
                     └───────────┬───────────┘
                                 │ HTTPS (REST)
                                 ▼
                     ┌───────────────────────┐
                     │  ASP.NET Core Web API │
                     │  (Clean Architecture) │
                     └───────────┬───────────┘
                                 │
             ┌───────────────────┼───────────────────┐
             ▼                   ▼                   ▼
       PostgreSQL             Redis             Hangfire
     (Control Plane DB)                       (Job Queue)
                                                     │
                                                     ▼
                                            Deployment Workers
                                                     │
                                                     ▼ (SSH / Docker)
                                              Managed Servers
                                            (Traefik + Odoo + PG)
```

---

## Repository Structure

```text
.
├── backend/                  # ASP.NET Core Clean Architecture backend
│   ├── src/
│   │   ├── OdooDeployer.Api
│   │   ├── OdooDeployer.Application
│   │   ├── OdooDeployer.Domain
│   │   ├── OdooDeployer.Infrastructure
│   │   └── OdooDeployer.Worker
│   └── tests/
├── frontend/                 # Next.js App Router UI
├── infrastructure/           # Docker, Traefik, compose templates & scripts
├── docs/                     # Documentation & guides
├── scripts/                  # Development & utility scripts
├── docker-compose.yml        # Local dev infrastructure (PostgreSQL, Redis)
└── GUIDE.md                  # Comprehensive architectural guide
```

---

## Quickstart

### 1. Start Infrastructure Dependencies
```bash
docker compose up -d
```

### 2. Run Backend
```bash
cd backend/src/OdooDeployer.Api
dotnet run
```
API & Swagger documentation will be available at `http://localhost:5000/swagger`.

### 3. Run Frontend
```bash
cd frontend
npm install
npm run dev
```
Web dashboard will be available at `http://localhost:3000`.
