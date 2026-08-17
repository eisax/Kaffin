#!/usr/bin/env bash
set -euo pipefail

echo "==> Setting up Kaffin development environment..."

echo "==> Starting local database & cache containers..."
docker compose up -d

echo "==> Restoring .NET backend dependencies..."
dotnet restore backend/OdooDeployer.sln

echo "==> Installing frontend dependencies..."
cd frontend
npm install

echo "==> Setup complete! You can now start the backend and frontend."
