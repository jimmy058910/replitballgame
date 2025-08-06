// Quick test script to simulate Cloud Run health check
const http = require('http');

const port = process.env.PORT || 8080;
const host = '0.0.0.0';

console.log(`Testing health check on ${host}:${port}/healthz`);

// Test if server would respond on Cloud Run port/host configuration
http.get(`http://127.0.0.1:${port === 8080 ? 5000 : port}/healthz`, (res) => {
  console.log(`✅ Health check responded: ${res.statusCode}`);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Response:', JSON.parse(data));
  });
}).on('error', (err) => {
  console.log(`❌ Health check failed: ${err.message}`);
});