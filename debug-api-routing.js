/**
 * DEBUG API ROUTING - Test all critical routes
 */

import fetch from 'node-fetch';

async function testRoutes() {
  const routes = [
    'http://localhost:5000/api/teams/8/standings',
    'http://localhost:5000/api/leagues/daily-schedule'
  ];
  
  for (const url of routes) {
    try {
      const response = await fetch(url);
      const text = await response.text();
      
      if (text.startsWith('<!DOCTYPE html>')) {
        console.log(`❌ ${url} - Returns HTML (Vite intercepted)`);
      } else if (text.startsWith('{') || text.startsWith('[')) {
        console.log(`✅ ${url} - Returns JSON`);
        const data = JSON.parse(text);
        if (url.includes('standings') && data.length > 0) {
          console.log(`   First team: ${data[0].name} (${data[0].points} pts)`);
        }
      } else {
        console.log(`⚠️ ${url} - Unknown response: ${text.substring(0, 50)}`);
      }
    } catch (error) {
      console.log(`❌ ${url} - Error: ${error.message}`);
    }
  }
}

testRoutes();