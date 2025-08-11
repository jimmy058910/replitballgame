#!/bin/bash

# EMERGENCY NUCLEAR DEPLOYMENT - SIMPLE DATABASE SERVER
# This script manually triggers the correct deployment workflow

set -e

echo "🚀 EMERGENCY DEPLOYMENT: Simple Database Server"
echo ""
echo "This will deploy the dual-mode database server that:"
echo "- Uses direct PostgreSQL connection (no Prisma, no Neon, no WebSocket)"
echo "- Handles both unix socket (Cloud Run) and public IP connections"
echo "- Deploys to 'realm-rivalry-simple-database' service (NEW SERVICE)"
echo ""

# Authenticate with GitHub CLI if needed
if ! gh auth status >/dev/null 2>&1; then
  echo "❌ GitHub CLI not authenticated"
  echo "Run: gh auth login"
  exit 1
fi

echo "✅ GitHub CLI authenticated"
echo ""

# Trigger the correct workflow
echo "🚀 Triggering deploy-simple-database.yml workflow..."
gh workflow run deploy-simple-database.yml

echo ""
echo "✅ Deployment triggered!"
echo ""
echo "Monitor deployment at:"
echo "https://github.com/$(gh repo view --json owner,name -q '.owner.login + "/" + .name')/actions"
echo ""
echo "Expected result:"
echo "- New service: realm-rivalry-simple-database"
echo "- Direct PostgreSQL connection"
echo "- No Neon references"
echo "- Working database connectivity"
