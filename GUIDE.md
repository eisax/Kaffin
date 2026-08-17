# Kaffin — Project Architecture, Infrastructure & Implementation Plan

## 1. What We Are Building

**Kaffin** is a centralized web-based control plane for managing multiple Odoo installations across multiple Linux servers.

The platform will allow an administrator or SaaS operator to:

* Register and manage Linux servers.
* Deploy new Odoo instances.
* Select Odoo versions.
* Select Docker images.
* Deploy PostgreSQL.
* Deploy custom Odoo addons.
* Configure Odoo databases.
* Configure domains.
* Automatically configure reverse proxying.
* Configure SSL.
* Start, stop, restart, and redeploy Odoo.
* View deployment progress.
* View Odoo logs.
* Monitor server and container health.
* Perform backups.
* Restore backups.
* Upgrade Odoo instances.
* Manage Odoo images.
* Manage custom addons.
* Track deployment history.
* Manage users, organizations, permissions and roles.
* Maintain audit logs.
* Eventually support customer subscriptions and billing.

The long-term objective is to have something conceptually similar to a specialized:

**"Odoo.sh / Coolify for self-hosted Odoo"**

but focused specifically on our own Odoo hosting/deployment requirements.

---

# 2. Core Concept

The system has two major parts:

```text
                    Kaffin
                         |
             +-----------+-----------+
             |                       |
             v                       v
       Control Plane             Managed Servers
             |                       |
      +------+-------+         +-----+------+
      |              |         |            |
   Database       Workers    Docker       Linux
      |              |         |            |
   Users          Deploy      Odoo        Nginx/
   Servers        Jobs        PostgreSQL   Traefik
   Instances      Backups
```

The **Control Plane** is the web application.

The **Managed Servers** are the actual machines running Odoo.

---

# 3. Final Technology Stack

## Frontend

```text
Next.js
TypeScript
Tailwind CSS
shadcn/ui
TanStack Query
Zod
React Hook Form
```

### Responsibilities

The frontend is responsible for:

* Dashboard
* Server management UI
* Odoo instance management
* Deployment wizard
* Deployment progress
* Logs
* Backups
* Domains
* Addons
* Images
* Users
* Roles
* Settings
* Monitoring dashboards

The frontend does **not** directly SSH into servers or manipulate Docker.

---

# 4. Backend

```text
ASP.NET Core
C#
Entity Framework Core
PostgreSQL
```

The backend is the brain of the platform.

It handles:

* Authentication
* Authorization
* Business logic
* Odoo instance management
* Server management
* Deployment orchestration
* Docker management
* SSH communication
* Image management
* Addon management
* Domain management
* Backup management
* Audit logging
* Job management
* Health checks
* API endpoints

The frontend communicates with the backend through HTTPS APIs.

```text
Browser
   |
   | HTTPS
   v
ASP.NET Core API
```

---

# 5. Database

## PostgreSQL

PostgreSQL will store the control-plane data.

Important entities include:

```text
User
Organization
Role
Permission

Server
ServerCredential

OdooInstance
OdooVersion
OdooImage

Deployment
DeploymentStep
DeploymentLog

Addon
AddonVersion
InstanceAddon

Domain
SslCertificate

Backup
BackupStorage

DockerContainer
ContainerMetric

AuditLog
Notification
SystemSetting
```

The Odoo databases themselves are separate from the deployer's application database.

For example:

```text
Kaffin DB
    |
    +-- users
    +-- servers
    +-- instances
    +-- deployments
    +-- backups
    +-- addons
    +-- domains
    +-- audit logs
```

versus:

```text
Odoo Server
    |
    +-- customer_a
    +-- customer_b
    +-- customer_c
```

The deployer database manages the infrastructure.

The Odoo databases contain the actual Odoo business data.

---

# 6. Background Processing

Deployment operations should not run directly inside an HTTP request.

For example:

```text
POST /api/instances/123/deploy
```

should create a deployment job rather than keeping the HTTP request open for several minutes.

We will use:

```text
Redis
+
Hangfire
```

Flow:

```text
Frontend
   |
   | Deploy
   v
ASP.NET API
   |
   | Create Job
   v
Hangfire
   |
   v
Deployment Worker
   |
   +-- SSH
   +-- Docker
   +-- PostgreSQL
   +-- Traefik
   +-- SSL
```

This allows deployments, backups, upgrades and other long-running operations to happen asynchronously.

---

# 7. Container Infrastructure

Odoo will run in Docker.

A typical customer environment will look like:

```text
Customer Odoo Environment
│
├── Odoo
│
├── PostgreSQL
│
├── Persistent volumes
│
├── Custom addons
│
└── Network
```

For example:

```text
Docker
│
├── odoo-client-a
│
├── postgres-client-a
│
└── network-client-a
```

The exact topology can evolve later depending on scale.

---

# 8. Odoo Images

We decided to use container images as the source of Odoo deployments.

There are two important image sources.

## Official Odoo Images

Official Odoo images can be used as the base/reference for supported versions.

Examples:

```text
odoo:17
odoo:18
odoo:19
```

## Our Own GHCR Images

For production deployments, we will maintain our own controlled images in GitHub Container Registry.

Example:

```text
ghcr.io/havano/odoo-base:17.0
ghcr.io/havano/odoo-base:18.0
ghcr.io/havano/odoo-base:19.0
```

These images can contain:

```text
Odoo
+
Python dependencies
+
OS dependencies
+
Required system libraries
```

This gives us control over the exact environment being deployed.

---

# 9. Custom Addons

We do not want to create a completely different Docker image for every customer simply because they have different addons.

Therefore the preferred architecture is:

```text
Odoo Base Image
       +
Custom Addons
       +
Customer Configuration
```

Example:

```text
ghcr.io/havano/odoo-base:19.0
                    |
                    +-- /mnt/extra-addons
                            |
                            +-- havanoposdesk
                            +-- havanoposdesk_odoo
                            +-- custom_accounting
                            +-- custom_inventory
```

This allows the same Odoo base image to be used for many customers.

The deployer will know which addons belong to which instance.

---

# 10. Image Versioning

We will avoid relying on:

```text
latest
```

for production.

Instead:

```text
ghcr.io/havano/odoo-base:19.0
```

and preferably deployments will ultimately be pinned to an image digest:

```text
ghcr.io/havano/odoo-base:19.0@sha256:...
```

This gives us reproducible deployments.

If 50 customers are deployed from the same image digest, we know they are running the exact same build.

---

# 11. Reverse Proxy

We decided to use:

```text
Traefik
```

as the preferred reverse proxy.

Its job is to route:

```text
customer-a.example.com
        |
        v
     Traefik
        |
        v
   Odoo A

customer-b.example.com
        |
        v
     Traefik
        |
        v
   Odoo B
```

Traefik can also handle automatic HTTPS/SSL integration.

The deployer will configure routing when a domain is attached to an Odoo instance.

---

# 12. Managed Server Architecture

A server can run multiple Odoo instances.

Example:

```text
SERVER #1
Ubuntu 24.04
32 GB RAM
8 CPU cores
240 GB SSD

Docker
│
├── Traefik
│
├── Odoo Instance A
├── PostgreSQL A
│
├── Odoo Instance B
├── PostgreSQL B
│
├── Odoo Instance C
└── PostgreSQL C
```

Another server can have:

```text
SERVER #2
│
├── Traefik
├── Odoo D
├── Odoo E
├── Odoo F
└── Odoo G
```

The deployer controls both servers.

---

# 13. Server Registration

The admin will be able to register a server:

```text
Server
-----------------------------
Name
Hostname/IP
SSH Port
SSH User
Authentication
Operating System
Docker Version
Available CPU
Available RAM
Available Storage
Status
```

After registration, the deployer performs a server health check.

Example:

```text
Connecting...
        |
        v
SSH OK
        |
        v
Docker OK
        |
        v
Disk OK
        |
        v
Memory OK
        |
        v
Server Ready
```

---

# 14. Deployment Flow

The primary workflow will be:

```text
Create Odoo Instance
        |
        v
Select Customer
        |
        v
Select Odoo Version
        |
        v
Select Odoo Image
        |
        v
Select Server
        |
        v
Select Addons
        |
        v
Configure Database
        |
        v
Configure Domain
        |
        v
Configure Resources
        |
        v
Deploy
```

The deployment worker then executes:

```text
1. Validate server
2. Validate image
3. Pull Docker image
4. Create directories
5. Create Docker network
6. Create volumes
7. Prepare PostgreSQL
8. Prepare Odoo configuration
9. Install custom addons
10. Configure environment variables
11. Create containers
12. Configure Traefik
13. Configure SSL
14. Start services
15. Run health checks
16. Initialize Odoo if required
17. Install selected modules
18. Record deployment
19. Mark instance as healthy
```

---

# 15. Deployment State Machine

Every deployment should have a known state.

Example:

```text
PENDING
   |
   v
QUEUED
   |
   v
PREPARING
   |
   v
PULLING_IMAGE
   |
   v
CREATING_DATABASE
   |
   v
DEPLOYING
   |
   v
CONFIGURING_PROXY
   |
   v
CONFIGURING_SSL
   |
   v
HEALTH_CHECK
   |
   v
COMPLETED
```

If something fails:

```text
DEPLOYING
    |
    X
    |
    v
FAILED
```

Every step should produce logs.

---

# 16. Deployment Logs

We need detailed deployment logs.

Example:

```text
[10:31:02] Deployment started
[10:31:04] Connecting to server
[10:31:05] SSH connection successful
[10:31:07] Pulling Odoo image
[10:32:12] Image downloaded
[10:32:14] Creating PostgreSQL container
[10:32:22] Creating Odoo container
[10:32:31] Configuring Traefik
[10:32:35] Configuring SSL
[10:32:48] Health check passed
[10:32:49] Deployment completed
```

These logs will be persisted against the deployment.

---

# 17. Odoo Instance Model

An Odoo instance should contain information such as:

```text
OdooInstance
-------------------------
Id
OrganizationId
Name
OdooVersion
OdooImageId
ServerId

DatabaseName
DatabaseUser

Domain
Status

CpuLimit
MemoryLimit
StorageLimit

CreatedAt
UpdatedAt
```

Example:

```text
Havano Zimbabwe
-------------------------
Odoo: 19.0
Image: havano/odoo-base:19.0
Server: Server #1
Database: havano_zimbabwe
Domain: zim.havano.com

Status: RUNNING
```

---

# 18. Customer / Organization Architecture

The platform should be designed for multi-tenancy from the beginning.

```text
Organization
    |
    +-- Users
    |
    +-- Odoo Instances
    |
    +-- Domains
    |
    +-- Backups
    |
    +-- Addons
    |
    +-- Deployments
```

This allows the platform to eventually manage different customers or organizations independently.

---

# 19. Authentication and Authorization

The backend will enforce permissions.

Example roles:

```text
SUPER_ADMIN
ADMIN
OPERATOR
VIEWER
CUSTOMER_ADMIN
```

Permissions can include:

```text
server.view
server.create
server.manage

instance.view
instance.create
instance.deploy
instance.restart
instance.upgrade
instance.delete

backup.create
backup.restore

addon.manage

domain.manage

user.manage
```

The frontend should hide functionality the user doesn't have permission to access, but the backend remains the authoritative security layer.

---

# 20. Audit Logging

Infrastructure operations are sensitive.

Actions such as:

```text
Deploy
Delete
Restart
Upgrade
Restore Backup
Change Domain
Change Image
Change Addons
Create Server
Delete Server
```

must be recorded.

Example:

```text
AuditLog
-------------------------
User
Action
Resource
ResourceId
IP
Timestamp
Metadata
```

Example:

```text
Josphat
DEPLOY_INSTANCE
OdooInstance: 42
2026-08-17 11:42
```

---

# 21. Backups

The platform will eventually manage:

```text
Database backups
Filestore backups
Configuration backups
Addon/configuration backups
```

A backup should be associated with:

```text
Instance
Server
Backup type
Storage location
Size
CreatedAt
Status
```

Restore should be treated as a background operation and heavily audited.

---

# 22. Domains

An Odoo instance can have one or more domain records.

Example:

```text
Odoo Instance
      |
      +-- zim.havano.com
      +-- www.zim.havano.com
```

The deployer will eventually automate:

```text
Domain
  |
  v
Traefik
  |
  v
Odoo container
```

DNS itself may initially remain externally managed.

Later we can integrate DNS providers.

---

# 23. Monitoring

The first version should provide basic health monitoring.

For every server:

```text
CPU
RAM
Disk
Docker status
Network
```

For every Odoo instance:

```text
Container status
CPU
Memory
Restart count
Health status
Uptime
```

Later:

```text
Prometheus
Grafana
```

can provide more advanced infrastructure monitoring.

---

# 24. API Structure

The ASP.NET API will be organized by domain rather than having one giant controller.

Example:

```text
/api/auth
/api/users
/api/organizations

/api/servers
/api/servers/{id}/health
/api/servers/{id}/containers
/api/servers/{id}/metrics

/api/instances
/api/instances/{id}
/api/instances/{id}/deploy
/api/instances/{id}/restart
/api/instances/{id}/stop
/api/instances/{id}/logs
/api/instances/{id}/metrics

/api/deployments
/api/deployments/{id}
/api/deployments/{id}/logs

/api/images
/api/versions

/api/addons
/api/addons/{id}

/api/domains
/api/backups
/api/audit-logs
```

---

# 25. Backend Architecture

We will use a clean layered architecture.

```text
backend/
└── src/
    ├── OdooDeployer.Api
    ├── OdooDeployer.Application
    ├── OdooDeployer.Domain
    ├── OdooDeployer.Infrastructure
    └── OdooDeployer.Worker
```

### Domain

Contains core business concepts:

```text
Entities
ValueObjects
Enums
DomainEvents
Interfaces
```

No Docker, SSH or PostgreSQL implementation details should live here.

### Application

Contains use cases:

```text
CreateServer
DeployInstance
RestartInstance
CreateBackup
RestoreBackup
RegisterAddon
AssignDomain
```

### Infrastructure

Contains implementations:

```text
PostgreSQL
EF Core
Docker
SSH
Traefik
GHCR
File storage
Redis
```

### API

Contains:

```text
Controllers
Authentication
Authorization
Middleware
API DTOs
Swagger
```

### Worker

Handles:

```text
Deployment jobs
Backup jobs
Upgrade jobs
Health checks
Cleanup jobs
```

---

# 26. Backend Project Structure

```text
backend/
│
├── src/
│   │
│   ├── OdooDeployer.Api/
│   │   ├── Controllers/
│   │   ├── Middleware/
│   │   ├── Filters/
│   │   ├── Extensions/
│   │   ├── DTOs/
│   │   └── Program.cs
│   │
│   ├── OdooDeployer.Application/
│   │   ├── Common/
│   │   ├── Servers/
│   │   │   ├── Commands/
│   │   │   └── Queries/
│   │   ├── Instances/
│   │   │   ├── Commands/
│   │   │   └── Queries/
│   │   ├── Deployments/
│   │   ├── Backups/
│   │   ├── Addons/
│   │   ├── Domains/
│   │   └── Users/
│   │
│   ├── OdooDeployer.Domain/
│   │   ├── Entities/
│   │   ├── ValueObjects/
│   │   ├── Enums/
│   │   ├── Events/
│   │   ├── Exceptions/
│   │   └── Interfaces/
│   │
│   ├── OdooDeployer.Infrastructure/
│   │   ├── Persistence/
│   │   ├── Docker/
│   │   ├── SSH/
│   │   ├── Traefik/
│   │   ├── GHCR/
│   │   ├── Storage/
│   │   ├── Redis/
│   │   └── Security/
│   │
│   └── OdooDeployer.Worker/
│       ├── Jobs/
│       ├── Workers/
│       └── Services/
│
└── tests/
    ├── OdooDeployer.Domain.Tests/
    ├── OdooDeployer.Application.Tests/
    ├── OdooDeployer.Infrastructure.Tests/
    └── OdooDeployer.Api.Tests/
```

---

# 27. Frontend Project Structure

```text
frontend/
│
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── forgot-password/
│   │
│   ├── dashboard/
│   │
│   ├── servers/
│   │   ├── page.tsx
│   │   ├── new/
│   │   └── [id]/
│   │
│   ├── instances/
│   │   ├── page.tsx
│   │   ├── new/
│   │   └── [id]/
│   │
│   ├── deployments/
│   │   └── [id]/
│   │
│   ├── addons/
│   ├── images/
│   ├── domains/
│   ├── backups/
│   ├── users/
│   ├── organizations/
│   └── settings/
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── dashboard/
│   ├── servers/
│   ├── instances/
│   ├── deployments/
│   ├── addons/
│   ├── backups/
│   └── domains/
│
├── lib/
│   ├── api/
│   ├── auth/
│   ├── validation/
│   └── utils/
│
├── hooks/
├── stores/
├── types/
└── config/
```

---

# 28. Infrastructure Repository

Infrastructure should be version controlled separately from the application logic.

```text
infrastructure/
│
├── docker/
│   ├── odoo/
│   │   ├── 17/
│   │   ├── 18/
│   │   └── 19/
│   │
│   └── postgres/
│
├── compose/
│   ├── templates/
│   ├── odoo-instance.yml
│   └── server.yml
│
├── traefik/
│   ├── static/
│   └── dynamic/
│
├── scripts/
│   ├── install-docker.sh
│   ├── prepare-server.sh
│   ├── backup.sh
│   └── health-check.sh
│
└── docs/
```

---

# 29. GHCR / Image Pipeline

The image pipeline will eventually look like:

```text
GitHub
   |
   v
Odoo Docker Build
   |
   v
GitHub Actions
   |
   v
GHCR
   |
   +-- odoo-base:17.0
   +-- odoo-base:18.0
   +-- odoo-base:19.0
```

The deployer then reads from the registry.

```text
Kaffin
      |
      v
GHCR
      |
      v
Pull exact image
      |
      v
Deploy
```

---

# 30. Git Repository Strategy

The initial project can be organized as:

```text
odoo-deployer/
│
├── frontend/
├── backend/
├── infrastructure/
├── docker/
├── docs/
├── scripts/
├── .github/
│   └── workflows/
│
├── docker-compose.yml
├── README.md
└── .gitignore
```

GitHub Actions will eventually handle:

```text
Frontend build
Backend build
Tests
Docker builds
GHCR publishing
```

---

# 31. Local Development Infrastructure

Our development environment should be reproducible.

Local:

```text
Docker Compose
│
├── PostgreSQL
├── Redis
└── optionally Traefik
```

The developer machine runs:

```text
Next.js
ASP.NET Core
```

locally.

Docker provides the infrastructure dependencies.

Example:

```text
Mac
│
├── Next.js       localhost:3000
├── ASP.NET       localhost:5000
│
└── Docker
    ├── PostgreSQL
    └── Redis
```

---

# 32. Production Control Plane

Production will eventually look like:

```text
Internet
    |
    v
Traefik / Reverse Proxy
    |
    +----------------------+
    |                      |
    v                      v
Next.js                 ASP.NET API
                           |
              +------------+-------------+
              |            |             |
              v            v             v
          PostgreSQL     Redis        Workers
                                          |
                                          v
                                    Managed Servers
```

The control plane itself should also run in Docker.

---

# 33. Managed Odoo Server

A managed server will eventually have:

```text
Ubuntu
│
├── Docker
│
├── Traefik
│
├── Odoo Instance A
│   └── PostgreSQL A
│
├── Odoo Instance B
│   └── PostgreSQL B
│
└── Odoo Instance C
    └── PostgreSQL C
```

The deployer connects to this machine through secure server management mechanisms.

---

# 34. Initial MVP

We should NOT attempt to build everything at once.

Version 1 should focus on the core deployment engine.

### MVP features

```text
[ ] User authentication
[ ] Dashboard
[ ] Server registration
[ ] Server health check
[ ] Odoo image management
[ ] Odoo instance creation
[ ] Odoo deployment
[ ] Docker container management
[ ] PostgreSQL provisioning
[ ] Custom addon mounting
[ ] Domain configuration
[ ] Traefik configuration
[ ] Basic SSL
[ ] Deployment logs
[ ] Start/stop/restart
[ ] Instance health status
```

Once that works, we have a real product.

---

# 35. Phase 2

```text
[ ] Backups
[ ] Restore
[ ] Deployment history
[ ] Upgrade Odoo
[ ] Image version management
[ ] Addon version management
[ ] Resource limits
[ ] Server metrics
[ ] Instance metrics
[ ] Audit logs
[ ] Role-based access control
```

---

# 36. Phase 3

```text
[ ] Organizations
[ ] Multi-tenant customer accounts
[ ] Customer portal
[ ] Subscription plans
[ ] Billing
[ ] Usage tracking
[ ] Automated provisioning
[ ] DNS provider integration
[ ] Advanced monitoring
[ ] Notifications
[ ] Email alerts
```

---

# 37. Phase 4 — Infrastructure Scale

At this point, if required, we can introduce a lightweight server agent.

```text
Control Plane
      |
      | Secure API
      v
Go Agent
      |
      +-- Docker
      +-- Containers
      +-- Logs
      +-- Metrics
      +-- Files
```

But this is deliberately **not part of the first implementation**.

We start with the ASP.NET Core backend communicating with servers directly.

---

# 38. Deployment Architecture

The most important architectural principle is:

```text
Frontend
    ↓
API
    ↓
Application Service
    ↓
Deployment Job
    ↓
Deployment Engine
    ↓
Server
    ↓
Docker
    ↓
Odoo
```

Not:

```text
Frontend
    ↓
SSH
    ↓
Server
```

The frontend should never have infrastructure credentials.

---

# 39. Deployment Engine

The deployment engine should be modular.

```text
DeploymentEngine
│
├── ServerPreparationService
├── DockerService
├── PostgreSQLService
├── OdooService
├── AddonService
├── TraefikService
├── SslService
├── BackupService
└── HealthCheckService
```

A deployment orchestrator coordinates them:

```text
DeploymentOrchestrator
        |
        +-- PrepareServer()
        |
        +-- PullImage()
        |
        +-- CreateNetwork()
        |
        +-- ProvisionDatabase()
        |
        +-- MountAddons()
        |
        +-- DeployOdoo()
        |
        +-- ConfigureProxy()
        |
        +-- ConfigureSsl()
        |
        +-- HealthCheck()
```

This keeps infrastructure operations separated and testable.

---

# 40. Security Architecture

Security is critical because this system will have access to production servers.

We will:

* Never expose SSH credentials to the frontend.
* Encrypt sensitive credentials at rest.
* Use environment variables/secrets for application secrets.
* Use HTTPS.
* Implement RBAC.
* Audit infrastructure operations.
* Validate all deployment parameters.
* Restrict server access.
* Avoid arbitrary shell commands from user input.
* Prefer predefined deployment operations.
* Pin production container images.
* Use separate credentials where possible.
* Implement rate limiting on sensitive endpoints.
* Validate uploaded addons/packages.
* Maintain deployment logs.

The deployment engine should not simply accept:

```text
POST /deploy

{
    "command": "rm -rf /"
}
```

and execute it.

Instead, deployment actions must be represented by controlled application operations.

---

# 41. First Database Schema

The first major entities should be:

```text
Users
Organizations
Roles
Permissions

Servers
ServerCredentials

OdooVersions
OdooImages

OdooInstances

Addons
AddonVersions
InstanceAddons

Domains

Deployments
DeploymentSteps
DeploymentLogs

Backups

AuditLogs
```

We should build these incrementally rather than trying to create the entire schema before writing functionality.

---

# 42. First Development Milestone

The first real milestone should be:

> **From the web dashboard, register a Linux server and deploy a clean Odoo instance onto it.**

The complete path should work:

```text
Next.js
   |
   | Create Instance
   v
ASP.NET Core
   |
   | Queue Deployment
   v
Hangfire
   |
   v
Deployment Worker
   |
   | SSH
   v
Ubuntu Server
   |
   | Docker
   v
GHCR
   |
   v
Odoo Image
   |
   v
Odoo Container
   |
   v
Traefik
   |
   v
customer.example.com
```

If we can accomplish that reliably, the fundamental architecture is proven.

---

# 43. Development Order

We will build in this order:

## Step 1 — Repository

Create:

```text
odoo-deployer/
├── frontend/
├── backend/
├── infrastructure/
├── docs/
└── scripts/
```

## Step 2 — ASP.NET Core foundation

Create:

```text
API
Domain
Application
Infrastructure
Worker
```

Configure:

```text
PostgreSQL
EF Core
Redis
Hangfire
Swagger
Authentication
```

## Step 3 — Next.js foundation

Create:

```text
Dashboard
Sidebar
Authentication
API client
Layout
UI system
```

## Step 4 — Server management

Build:

```text
Create Server
View Server
Test SSH
Check Docker
Check CPU/RAM/Disk
```

## Step 5 — Docker engine

Build the internal abstraction:

```text
IDockerService
```

with operations such as:

```text
PullImage
CreateNetwork
CreateContainer
StartContainer
StopContainer
RestartContainer
RemoveContainer
GetContainerLogs
GetContainerStatus
```

## Step 6 — Odoo deployment

Build:

```text
IOdooDeploymentService
```

and deploy a real Odoo instance.

## Step 7 — PostgreSQL

Automate database provisioning.

## Step 8 — Custom addons

Support:

```text
/mnt/extra-addons
```

and addon registration.

## Step 9 — Traefik

Automatically expose:

```text
customer.example.com
```

to the correct Odoo container.

## Step 10 — SSL

Automate HTTPS.

## Step 11 — Deployment UI

Show:

```text
Queued
Preparing
Pulling Image
Deploying
Configuring
Health Check
Completed
```

with live logs.

## Step 12 — Backups

Implement database and filestore backups.

## Step 13 — Upgrades

Implement controlled Odoo image upgrades.

## Step 14 — Monitoring

Add server and container metrics.

## Step 15 — Multi-tenancy

Add organizations, customer accounts and stronger RBAC.

---

# 44. What the Finished Product Should Feel Like

An administrator should eventually be able to log in and see:

```text
Kaffin

Dashboard

Servers
  3 Online
  0 Offline

Odoo Instances
  42 Running
  2 Deploying
  1 Failed

Deployments
  5 Today

Backups
  98 Successful
```

Then:

```text
Instances
------------------------------------------------
Havano Zimbabwe
zim.havano.com
Odoo 19
Server #1
● Running

[Open] [Restart] [Backup] [Upgrade]
```

And to deploy another environment:

```text
+ Deploy Odoo

Customer:       Havano Botswana
Odoo Version:   19.0
Image:          ghcr.io/havano/odoo-base:19.0
Server:         Server #2
Database:       havano_botswana

Addons:
  ☑ havanoposdesk
  ☑ accounting_custom

Domain:
  bw.havano.com

[ Deploy ]
```

The operator shouldn't need to SSH into the server and manually run:

```text
docker compose up -d
nginx configuration
certbot
database creation
addon copying
permissions
logs
```

The **entire purpose of Kaffin is to turn those infrastructure operations into controlled, repeatable software operations.**

---

# 45. Final Architecture

```text
                              USERS
                                |
                                v
                     +---------------------+
                     |      Next.js        |
                     |   TypeScript UI     |
                     +----------+----------+
                                |
                              HTTPS
                                |
                                v
                     +---------------------+
                     |    ASP.NET Core     |
                     |       C# API        |
                     +----------+----------+
                                |
             +------------------+------------------+
             |                  |                  |
             v                  v                  v
       PostgreSQL             Redis             Hangfire
       Control DB                                  |
                                                  v
                                         Deployment Worker
                                                  |
                         +------------------------+----------------------+
                         |                        |                      |
                         v                        v                      v
                       SSH                     GHCR                  Storage
                         |                        |
                         v                        v
                 +---------------+         Odoo Images
                 | Linux Server  |
                 +-------+-------+
                         |
                       Docker
                         |
             +-----------+-----------+
             |                       |
             v                       v
         Traefik                   Odoo
             |                       |
             |                 +-----+------+
             |                 |            |
             v                 v            v
          Domain          PostgreSQL     Addons
```

## Final Stack

**Frontend**

```text
Next.js
TypeScript
Tailwind CSS
shadcn/ui
TanStack Query
Zod
React Hook Form
```

**Backend**

```text
ASP.NET Core
C#
Entity Framework Core
```

**Data**

```text
PostgreSQL
Redis
```

**Jobs**

```text
Hangfire
```

**Infrastructure**

```text
Docker
Traefik
SSH
Ubuntu Linux
```

**Odoo**

```text
Official Odoo images
        +
Our controlled GHCR images
        +
Custom addons
```

**CI/CD**

```text
GitHub
GitHub Actions
GHCR
```

**Future**

```text
Prometheus
Grafana
Go server agent
DNS integrations
Billing
Customer portal
```

The key principle is that **C#/.NET is the control plane, Next.js is the control interface, and Docker/Instance servers are the execution layer**. We keep those responsibilities separate from day one so the platform can grow from a single-server deployment tool into a genuine multi-server Instance hosting platform.
