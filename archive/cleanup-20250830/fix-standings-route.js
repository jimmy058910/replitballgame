/**
 * FIX STANDINGS ROUTE - Create direct route for standings API
 */

import fetch from 'node-fetch';

async function testStandingsRoute() {
  console.log('🔧 Testing standings route access...');
  
  // Test both routes
  const routes = [
    'http://localhost:5000/api/teams/8/standings',  // This fails
    'http://localhost:5000/api/leagues/division/8/standings'  // Alternative
  ];
  
  for (const url of routes) {
    try {
      console.log(`\n🔍 Testing: ${url}`);
      const response = await fetch(url);
      const text = await response.text();
      
      if (text.startsWith('<!DOCTYPE html>')) {
        console.log(`❌ Returns HTML (Vite intercepted)`);
      } else if (text.startsWith('{') || text.startsWith('[')) {
        console.log(`✅ Returns JSON - SUCCESS!`);
        const data = JSON.parse(text);
        if (data.length > 0) {
          console.log(`   Oakland Cougars record: ${data.find(t => t.name === 'Oakland Cougars')?.wins || 0}W-${data.find(t => t.name === 'Oakland Cougars')?.losses || 0}L`);
        }
      } else {
        console.log(`⚠️ Unknown response: ${text.substring(0, 100)}`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
}

testStandingsRoute();