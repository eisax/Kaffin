# Architecture Guide

Refer to [GUIDE.md](../GUIDE.md) for the complete end-to-end specification.

## Core Topology
1. **Control Plane**:
   - Web Frontend: Next.js 14/15, Tailwind CSS, TanStack Query, shadcn/ui.
   - Core API: ASP.NET Core with Clean Architecture (Domain, Application, Infrastructure, Api, Worker).
   - Storage: PostgreSQL (Control DB), Redis (State & Job Caching).
   - Background Engine: Hangfire for long-running deployment, backup, and health check jobs.
2. **Execution Layer (Managed Servers)**:
   - Linux host running Docker & Docker Compose.
   - Central Traefik proxy instance handling dynamic routing and Let's Encrypt TLS certificates.
   - Dedicated Odoo + PostgreSQL container pairs per tenant instance with custom `/mnt/extra-addons` mounts.
