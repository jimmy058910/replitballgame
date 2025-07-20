#!/bin/bash

# Quick setup for missing secrets (run this if debug shows missing secrets)

echo "🔐 Quick Secret Setup for Realm Rivalry"
echo ""

# Get your current .env values
if [ -f ".env" ]; then
    echo "Found .env file, extracting values..."
    
    # Extract DATABASE_URL
    DATABASE_URL=$(grep "^DATABASE_URL=" .env | cut -d '=' -f2- | tr -d '"')
    if [ ! -z "$DATABASE_URL" ]; then
        echo "Creating DATABASE_URL secret..."
        echo "$DATABASE_URL" | gcloud secrets create DATABASE_URL --data-file=-
    fi
    
    # Extract SESSION_SECRET  
    SESSION_SECRET=$(grep "^SESSION_SECRET=" .env | cut -d '=' -f2- | tr -d '"')
    if [ ! -z "$SESSION_SECRET" ]; then
        echo "Creating SESSION_SECRET secret..."
        echo "$SESSION_SECRET" | gcloud secrets create SESSION_SECRET --data-file=-
    fi
    
    # Extract GOOGLE_CLIENT_ID
    GOOGLE_CLIENT_ID=$(grep "^GOOGLE_CLIENT_ID=" .env | cut -d '=' -f2- | tr -d '"')
    if [ ! -z "$GOOGLE_CLIENT_ID" ]; then
        echo "Creating GOOGLE_CLIENT_ID secret..."
        echo "$GOOGLE_CLIENT_ID" | gcloud secrets create GOOGLE_CLIENT_ID --data-file=-
    fi
    
    # Extract GOOGLE_CLIENT_SECRET
    GOOGLE_CLIENT_SECRET=$(grep "^GOOGLE_CLIENT_SECRET=" .env | cut -d '=' -f2- | tr -d '"')
    if [ ! -z "$GOOGLE_CLIENT_SECRET" ]; then
        echo "Creating GOOGLE_CLIENT_SECRET secret..."
        echo "$GOOGLE_CLIENT_SECRET" | gcloud secrets create GOOGLE_CLIENT_SECRET --data-file=-
    fi
    
    echo "✅ Secrets created from .env file"
else
    echo "❌ No .env file found. You'll need to create secrets manually:"
    echo ""
    echo "gcloud secrets create DATABASE_URL --data-file=<(echo 'your_database_url')"
    echo "gcloud secrets create SESSION_SECRET --data-file=<(echo 'your_session_secret')"  
    echo "gcloud secrets create GOOGLE_CLIENT_ID --data-file=<(echo 'your_client_id')"
    echo "gcloud secrets create GOOGLE_CLIENT_SECRET --data-file=<(echo 'your_client_secret')"
fi