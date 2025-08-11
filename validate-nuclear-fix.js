/**
 * VALIDATE NUCLEAR FIX - Test the new revision directly
 * Cloud Run deployed new revision 409938e1 with nuclear fix, but traffic is still on old revision b558148f
 * This script tests the NEW revision directly to validate the fix works
 */

import fetch from 'node-fetch';

async function validateNuclearFix() {
  console.log('🔍 VALIDATING NUCLEAR FIX: Testing NEW revision directly...');
  console.log('');
  
  // NEW revision URL (always gets latest deployment)
  const newRevisionUrl = 'https://latest---realm-rivalry-express-database-o6fd46yesq-uc.a.run.app';
  
  // OLD service URL (routes to contaminated revision b558148f)  
  const oldServiceUrl = 'https://realm-rivalry-express-database-108005641993.us-central1.run.app';
  
  console.log('🆕 NEW REVISION (nuclear fix): ' + newRevisionUrl);
  console.log('🏚️ OLD SERVICE (contaminated): ' + oldServiceUrl);
  console.log('');
  
  try {
    // Test the NEW revision health
    console.log('🧪 TESTING NEW REVISION HEALTH...');
    const newHealthResponse = await fetch(`${newRevisionUrl}/health`);
    const newHealthData = await newHealthResponse.json();
    
    console.log('NEW REVISION HEALTH STATUS:');
    console.log('- Server Status:', newHealthData.status);
    console.log('- Database Status:', newHealthData.database?.status || 'unknown');
    console.log('- Database Health:', newHealthData.database?.health || 'unknown');
    
    if (newHealthData.database?.status && !newHealthData.database.status.includes('WebSocket')) {
      console.log('✅ SUCCESS: Nuclear fix worked! No WebSocket errors in new revision');
      return true;
    } else if (newHealthData.database?.status && newHealthData.database.status.includes('WebSocket')) {
      console.log('❌ FAILED: Nuclear fix incomplete - still has WebSocket errors');
      return false;
    } else {
      console.log('⚠️ UNCLEAR: Database status not available for analysis');
      return false;
    }
    
  } catch (error) {
    console.error('❌ VALIDATION ERROR:', error.message);
    return false;
  }
}

// Run validation
validateNuclearFix().then(success => {
  if (success) {
    console.log('');
    console.log('🚀 NEXT STEP: Switch Cloud Run traffic to new revision');
    console.log('Command: gcloud run services update-traffic realm-rivalry-express-database --region=us-central1 --to-revisions=realm-rivalry-express-database-409938e1=100');
  } else {
    console.log('');
    console.log('🔧 NEXT STEP: Further debugging required');
  }
  process.exit(success ? 0 : 1);
});