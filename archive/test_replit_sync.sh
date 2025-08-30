#!/bin/bash
# Test script to verify Replit → GCP integration works

echo "🧪 Testing Replit Sync → GCP Deployment Integration"
echo "================================================="
echo ""

echo "📝 To test your setup:"
echo ""
echo "1. **In Replit**: Make a small change (add a comment, etc.)"
echo "2. **In Replit**: Click 'Sync with Remote' button"
echo "3. **Check builds**: https://console.cloud.google.com/cloud-build/builds"
echo "4. **Verify deployment**: Your Cloud Run URL should update"
echo ""
echo "🕐 Typical timing:"
echo "   • GitHub sync: ~5-10 seconds"  
echo "   • Build start: ~30 seconds after sync"
echo "   • Total deployment: ~5-8 minutes"
echo ""
echo "✅ Success indicators:"
echo "   • New build appears in Cloud Build console"
echo "   • Build completes with green checkmark"
echo "   • Cloud Run service shows new revision"
echo ""

# Check if trigger exists
if gcloud builds triggers list --project=direct-glider-465821-p7 --filter="name:replit-sync-auto-deploy" --format="value(name)" | grep -q "replit-sync-auto-deploy"; then
  echo "✅ Integration trigger exists"
else
  echo "⚠️ Integration trigger not found - run create_trigger.sh first"
fi

